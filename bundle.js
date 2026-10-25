/**
 * LocalLoop 3D Game Bundle (Self-contained, Zero-CORS, Works everywhere)
 */
(function(window, document) {
  'use strict';

  // Ensure THREE is loaded
  if (typeof THREE === 'undefined') {
    console.error('Three.js must be loaded before LocalLoop game bundle.');
    return;
  }

  /* --- AUDIO ENGINE --- */
  /**
 * LocalLoop Non-Copyright Music & Sound Engine
 * Direct HTML5 Audio playback for 100% reliable sound on file://, localhost, and Vercel.
 */

class SoundEngine {
  constructor() {
    this.isMuted = false;
    this.isPlaying = false;
    this.initialized = false;

    // HTML5 Audio Element for the acoustic guitar track
    this.bgAudio = null;
    this.currentVolume = 0.75;
    this.stagePosition = { x: 0, y: 1.2, z: -11 };

    // Web Audio Context for procedural SFX & synth fallback
    this.ctx = null;
    this.sfxGain = null;
    this.synthGain = null;
    this.isSynthPlaying = false;
    this.synthInterval = null;

    this.onStateChange = null;
    this.initAudioElement();
  }

  initAudioElement() {
    try {
      this.bgAudio = new Audio('assets/audio/rooftop_live_acoustic.mp3');
      this.bgAudio.loop = true;
      this.bgAudio.preload = 'auto';
      this.bgAudio.volume = this.currentVolume;

      this.bgAudio.addEventListener('playing', () => {
        this.isPlaying = true;
        if (this.onStateChange) this.onStateChange(true);
      });

      this.bgAudio.addEventListener('pause', () => {
        this.isPlaying = false;
        if (this.onStateChange) this.onStateChange(false);
      });

      this.bgAudio.addEventListener('error', (e) => {
        console.warn('Audio file error, falling back to Web Audio synth:', e);
        this.startSynthMusic();
      });
    } catch (e) {
      console.warn('HTML5 Audio not available:', e);
    }
  }

  initWebAudio() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);

      this.synthGain = this.ctx.createGain();
      this.synthGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.synthGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio context error:', e);
    }
  }

  resume() {
    this.initWebAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isMuted) return;

    if (this.bgAudio) {
      this.bgAudio.volume = this.currentVolume;
      const playPromise = this.bgAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isPlaying = true;
          if (this.onStateChange) this.onStateChange(true);
        }).catch(err => {
          console.log('Autoplay restriction active, waiting for direct user gesture:', err.message);
          // Fallback to synth if audio file couldn't be played
          this.startSynthMusic();
        });
      }
    } else {
      this.startSynthMusic();
    }
  }

  toggleMute() {
    // If not playing yet, start playing
    if (!this.isPlaying) {
      this.isMuted = false;
      this.resume();
      if (this.onStateChange) this.onStateChange(true);
      return false;
    }

    this.isMuted = !this.isMuted;

    if (this.bgAudio) {
      if (this.isMuted) {
        this.bgAudio.pause();
        this.stopSynthMusic();
      } else {
        this.resume();
      }
    }

    if (this.onStateChange) {
      this.onStateChange(!this.isMuted && this.isPlaying);
    }

    return this.isMuted;
  }

  updateSpatialAudio(playerPos) {
    if (!playerPos) return;

    // Distance to Stage (0, 1.2, -11)
    const dx = playerPos.x - this.stagePosition.x;
    const dz = playerPos.z - this.stagePosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Natural volume curve: 0.35 at perimeter to 1.0 directly in front of stage
    this.currentVolume = Math.max(0.35, Math.min(1.0, 1.0 - (dist / 36)));

    if (this.bgAudio && !this.isMuted) {
      this.bgAudio.volume = this.currentVolume;
    }

    if (this.synthGain && this.ctx) {
      this.synthGain.gain.setTargetAtTime(this.currentVolume * 0.5, this.ctx.currentTime, 0.1);
    }
  }

  /* ----------------------------------------------------
     Procedural Synth Acoustic Music (Fallback Layer)
     ---------------------------------------------------- */
  startSynthMusic() {
    if (this.isSynthPlaying || this.isMuted || !this.ctx) return;
    this.isSynthPlaying = true;

    const chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [110.00, 130.81, 164.81, 196.00], // Am7
      [87.31, 130.81, 174.61, 220.00],  // Fmaj7
      [98.00, 146.83, 196.00, 246.94]   // G7
    ];

    let chordIdx = 0;
    this.synthInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      const chord = chords[chordIdx];
      chord.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.isMuted && this.ctx) {
            this.playAcousticPluck(freq, 0.12, 0.8);
          }
        }, idx * 140);
      });
      chordIdx = (chordIdx + 1) % chords.length;
    }, 1800);
  }

  stopSynthMusic() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.isSynthPlaying = false;
  }

  playAcousticPluck(freq, volume, duration = 0.8) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.synthGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /* ----------------------------------------------------
     Interactive UI SFX
     ---------------------------------------------------- */
  playTransitionWhoosh(isEntering = true) {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, now);

    if (isEntering) {
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + 0.6);
    } else {
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.6);
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.6);
    }

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  playHotspotInspect() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [659.25, 830.61, 987.77].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      gain.gain.setValueAtTime(0.12, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.35);
    });
  }

  playClick() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playBookingCelebration() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.22, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.65);
    });
  }
}

const sound = new SoundEngine(); window.sound = sound;


  /* --- APARTMENT SCENE --- */
  

class ApartmentScene {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ApartmentScene';

    // Animation variables
    this.clock = new THREE.Clock();
    this.characterGroup = null;
    this.characterChest = null;
    this.characterHead = null;
    this.characterArms = null;
    this.phoneMesh = null;
    this.steamParticles = null;
    this.lampLight = null;

    // Smile & phone put-down animation flags
    this.isEnding = false;
    this.endingProgress = 0;

    this.buildScene();
  }

  buildScene() {
    // 1. Room Shell & Materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1b1d28,
      roughness: 0.85,
      metalness: 0.1
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2b1e17,
      roughness: 0.45,
      metalness: 0.15
    });

    // Floor (Parquet Wood)
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Back Wall
    const backWallGeo = new THREE.PlaneGeometry(16, 8);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 4, -5);
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(backWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-8, 4, 3);
    this.group.add(leftWall);

    // Baseboards
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 0.7 });
    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 0.08), baseboardMat);
    baseboard.position.set(0, 0.125, -4.95);
    this.group.add(baseboard);

    // 2. Balcony City Window (Right Wall / Background)
    this.buildBalconyWindow();

    // 3. Contemporary Furniture (Sofa, Table, Rug, Lamp)
    this.buildFurniture();

    // 4. The 22-year-old Indian Man & Smartphone
    this.buildCharacter();

    // 5. Ambient & Accent Lighting
    this.setupLighting();

    // 6. Coffee Steam Particles
    this.buildSteam();
  }

  buildBalconyWindow() {
    const windowGroup = new THREE.Group();

    // Window Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1c24, metalness: 0.8, roughness: 0.3 });
    const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.5, 4.2), frameMat);
    outerFrame.position.set(4.5, 3.2, -4.8);
    windowGroup.add(outerFrame);

    // Window Glass
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x203045,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.6
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 5.3), glassMat);
    glass.position.set(4.5, 3.2, -4.75);
    windowGroup.add(glass);

    // City Backdrop visible outside window
    const cityMat = new THREE.MeshBasicMaterial({ color: 0x090c18 });
    const cityBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(8, 7), cityMat);
    cityBackdrop.position.set(4.5, 3.5, -5.8);
    windowGroup.add(cityBackdrop);

    // Distant glowing window grid outside
    const windowPointsMat = new THREE.PointsMaterial({
      color: 0xffd999,
      size: 0.06,
      transparent: true,
      opacity: 0.75
    });
    const windowPointsGeo = new THREE.BufferGeometry();
    const pointPositions = [];
    for (let i = 0; i < 90; i++) {
      pointPositions.push(
        2.5 + Math.random() * 4.0,
        1.5 + Math.random() * 4.0,
        -5.6
      );
    }
    windowPointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    const cityLights = new THREE.Points(windowPointsGeo, windowPointsMat);
    windowGroup.add(cityLights);

    this.group.add(windowGroup);
  }

  buildFurniture() {
    // Area Rug
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0xded5c4,
      roughness: 0.95,
      metalness: 0.05
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.2), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.015, -0.8);
    rug.receiveShadow = true;
    this.group.add(rug);

    // 3-Seater Sofa
    const sofaMat = new THREE.MeshStandardMaterial({
      color: 0x232734, // Modern deep slate/charcoal fabric
      roughness: 0.85
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x2b3040,
      roughness: 0.8
    });
    const woodLegMat = new THREE.MeshStandardMaterial({
      color: 0x422d1c,
      roughness: 0.5
    });

    const sofaGroup = new THREE.Group();

    // Base Frame
    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 1.4), sofaMat);
    sofaBase.position.set(0, 0.45, -1.8);
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    sofaGroup.add(sofaBase);

    // Backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.4), sofaMat);
    backrest.position.set(0, 1.15, -2.35);
    backrest.castShadow = true;
    sofaGroup.add(backrest);

    // Left Armrest
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 1.4), sofaMat);
    leftArm.position.set(-1.85, 0.75, -1.8);
    leftArm.castShadow = true;
    sofaGroup.add(leftArm);

    // Right Armrest
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 1.4), sofaMat);
    rightArm.position.set(1.85, 0.75, -1.8);
    rightArm.castShadow = true;
    sofaGroup.add(rightArm);

    // 3 Seat Cushions
    for (let i = -1; i <= 1; i++) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 1.15), cushionMat);
      cushion.position.set(i * 1.12, 0.75, -1.75);
      cushion.castShadow = true;
      sofaGroup.add(cushion);
    }

    // Accent Throw Pillow
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.9 });
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.2), pillowMat);
    pillow.position.set(-1.45, 1.0, -1.9);
    pillow.rotation.set(0.1, 0.3, -0.15);
    sofaGroup.add(pillow);

    // Sofa Tapered Wooden Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.025, 0.28, 8);
    const legPositions = [
      [-1.65, 0.14, -1.25],
      [1.65, 0.14, -1.25],
      [-1.65, 0.14, -2.35],
      [1.65, 0.14, -2.35]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, woodLegMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      sofaGroup.add(leg);
    });

    this.group.add(sofaGroup);

    // Coffee Table
    const tableGroup = new THREE.Group();
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x1f242e,
      roughness: 0.35,
      metalness: 0.2
    });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.9), tableTopMat);
    tableTop.position.set(0, 0.48, -0.3);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Metal Hairpin Legs
    const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x0f1118, metalness: 0.9, roughness: 0.2 });
    const tLegPositions = [
      [-0.8, 0.24, -0.65],
      [0.8, 0.24, -0.65],
      [-0.8, 0.24, 0.05],
      [0.8, 0.24, 0.05]
    ];
    tLegPositions.forEach(p => {
      const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.48, 8), tableLegMat);
      tLeg.position.set(...p);
      tLeg.castShadow = true;
      tableGroup.add(tLeg);
    });

    // Coffee Mug on table
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.1, 16), mugMat);
    mug.position.set(0.45, 0.57, -0.3);
    mug.castShadow = true;
    tableGroup.add(mug);

    this.group.add(tableGroup);

    // Arc Floor Lamp
    const lampGroup = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.85, roughness: 0.25 });
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      roughness: 0.9,
      emissive: 0xff9900,
      emissiveIntensity: 0.6
    });

    // Base
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 24), brassMat);
    lampBase.position.set(-2.8, 0.03, -1.6);
    lampGroup.add(lampBase);

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 12), brassMat);
    stem.position.set(-2.8, 1.28, -1.6);
    lampGroup.add(stem);

    // Overhead Shade
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.38, 20, 1, true), shadeMat);
    shade.position.set(-2.2, 2.45, -1.6);
    shade.rotation.x = Math.PI;
    lampGroup.add(shade);

    // Lamp Light (Warm 2700K Glow)
    this.lampLight = new THREE.PointLight(0xffb347, 1.8, 8.5);
    this.lampLight.position.set(-2.2, 2.3, -1.6);
    this.lampLight.castShadow = true;
    lampGroup.add(this.lampLight);

    this.group.add(lampGroup);

    // Potted Indoor Plant (Monstera / Fiddle Leaf Fig)
    this.buildPlant(-2.4, 0, -0.4);

    // Wall Art: The Terrace Social Gig Poster
    const posterMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.4
    });
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), posterMat);
    poster.position.set(0, 3.4, -4.92);
    this.group.add(poster);

    const posterBorderMat = new THREE.MeshStandardMaterial({ color: 0x0f1016, roughness: 0.3 });
    const posterFrame = new THREE.Mesh(new THREE.BoxGeometry(1.68, 2.28, 0.04), posterBorderMat);
    posterFrame.position.set(0, 3.4, -4.94);
    this.group.add(posterFrame);
  }

  buildPlant(x, y, z) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, y, z);

    // Ceramic Pot
    const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.45, 16), potMat);
    pot.position.y = 0.225;
    pot.castShadow = true;
    plantGroup.add(pot);

    // Soil
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), new THREE.MeshBasicMaterial({ color: 0x271910 }));
    soil.position.y = 0.42;
    plantGroup.add(soil);

    // Leaves
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.6,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const leafGeo = new THREE.SphereGeometry(0.24, 8, 8);
      leafGeo.scale(1.2, 0.08, 1.8);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.25, 0.55 + i * 0.08, Math.sin(angle) * 0.25);
      leaf.rotation.set(0.3 * Math.sin(angle), angle, 0.4);
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }

    this.group.add(plantGroup);
  }

  /* ----------------------------------------------------
     The 22-Year-Old Indian Man Model (Seated on Sofa)
     Black T-Shirt, Beige Chinos, White Sneakers
     ---------------------------------------------------- */
  buildCharacter() {
    this.characterGroup = new THREE.Group();
    // Sitting on center cushion of sofa
    this.characterGroup.position.set(0, 0, -1.65);

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x9e6c46, // Warm Indian skin complexion
      roughness: 0.65,
      metalness: 0.05
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x141210, // Dark brown / black textured hair
      roughness: 0.95
    });

    const tshirtMat = new THREE.MeshStandardMaterial({
      color: 0x16161a, // Black crew-neck cotton T-shirt
      roughness: 0.8
    });

    const trouserMat = new THREE.MeshStandardMaterial({
      color: 0xc8b89d, // Beige chinos
      roughness: 0.75
    });

    const sneakerMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Clean white sneakers
      roughness: 0.3
    });

    // 1. Pelvis / Hips (Seated on cushion at height ~0.8)
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.4), trouserMat);
    pelvis.position.set(0, 0.82, -0.05);
    this.characterGroup.add(pelvis);

    // 2. Thighs (Extending horizontally forward toward coffee table)
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.48), trouserMat);
    leftThigh.position.set(-0.16, 0.8, 0.22);
    this.characterGroup.add(leftThigh);

    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.48), trouserMat);
    rightThigh.position.set(0.16, 0.8, 0.22);
    this.characterGroup.add(rightThigh);

    // 3. Lower Legs / Shins (Dropping vertically to floor)
    const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.65, 12), trouserMat);
    leftShin.position.set(-0.16, 0.44, 0.44);
    this.characterGroup.add(leftShin);

    const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.65, 12), trouserMat);
    rightShin.position.set(0.16, 0.44, 0.44);
    this.characterGroup.add(rightShin);

    // 4. White Sneakers
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.28), sneakerMat);
    leftShoe.position.set(-0.16, 0.07, 0.52);
    this.characterGroup.add(leftShoe);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.28), sneakerMat);
    rightShoe.position.set(0.16, 0.07, 0.52);
    this.characterGroup.add(rightShoe);

    // 5. Torso / Chest (Black T-shirt, leaning slightly forward)
    this.characterChest = new THREE.Group();
    this.characterChest.position.set(0, 0.95, -0.05);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.32), tshirtMat);
    torso.position.y = 0.28;
    torso.rotation.x = 0.14; // Natural leaning forward toward phone
    torso.castShadow = true;
    this.characterChest.add(torso);

    // 6. Neck & Head
    this.characterHead = new THREE.Group();
    this.characterHead.position.set(0, 0.62, 0.08);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 12), skinMat);
    neck.position.y = 0.05;
    this.characterHead.add(neck);

    // Head Mesh
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), skinMat);
    head.position.set(0, 0.2, 0.04);
    head.scale.set(1.0, 1.15, 1.05);
    head.castShadow = true;
    this.characterHead.add(head);

    // Hair (Modern textured fade haircut)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.168, 16, 16), hairMat);
    hair.position.set(0, 0.25, 0.02);
    hair.scale.set(1.02, 1.1, 1.02);
    this.characterHead.add(hair);

    // Slight head downward tilt to look at the smartphone
    this.characterHead.rotation.x = 0.26;
    this.characterChest.add(this.characterHead);

    // 7. Arms holding the Smartphone
    this.characterArms = new THREE.Group();
    this.characterArms.position.set(0, 0.48, 0.05);

    // Upper arms (shoulders down)
    const armGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.35, 12);
    const leftArmUpper = new THREE.Mesh(armGeo, tshirtMat);
    leftArmUpper.position.set(-0.28, -0.05, 0.08);
    leftArmUpper.rotation.set(0.4, 0, 0.2);
    this.characterArms.add(leftArmUpper);

    const rightArmUpper = new THREE.Mesh(armGeo, tshirtMat);
    rightArmUpper.position.set(0.28, -0.05, 0.08);
    rightArmUpper.rotation.set(0.4, 0, -0.2);
    this.characterArms.add(rightArmUpper);

    // Forearms (bent inward toward phone)
    const forearmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.36, 12);
    const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
    leftForearm.position.set(-0.2, -0.18, 0.28);
    leftForearm.rotation.set(1.1, 0.45, -0.5);
    this.characterArms.add(leftForearm);

    const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
    rightForearm.position.set(0.2, -0.18, 0.28);
    rightForearm.rotation.set(1.1, -0.45, 0.5);
    this.characterArms.add(rightForearm);

    // Hands
    const handGeo = new THREE.BoxGeometry(0.08, 0.06, 0.12);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.11, -0.14, 0.44);
    leftHand.rotation.set(0.8, 0.2, -0.2);
    this.characterArms.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.11, -0.14, 0.44);
    rightHand.rotation.set(0.8, -0.2, 0.2);
    this.characterArms.add(rightHand);

    // 8. The 3D Smartphone held in hands
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(0, -0.12, 0.46);
    phoneGroup.rotation.set(0.75, 0, 0);

    // Phone casing (Titanium dark border)
    const phoneCaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e24,
      metalness: 0.9,
      roughness: 0.2
    });
    const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.015), phoneCaseMat);
    phoneGroup.add(phoneBody);

    // Phone Screen Glass (Glows with LocalLoop App Light)
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.148, 0.305), screenMat);
    screen.position.z = 0.009;
    phoneGroup.add(screen);

    // Screen light casting onto face & t-shirt
    const phoneScreenLight = new THREE.PointLight(0xa855f7, 0.8, 1.2);
    phoneScreenLight.position.set(0, 0, 0.08);
    phoneGroup.add(phoneScreenLight);

    this.phoneMesh = phoneGroup;
    this.characterArms.add(this.phoneMesh);

    this.characterChest.add(this.characterArms);
    this.characterGroup.add(this.characterChest);
    this.group.add(this.characterGroup);
  }

  setupLighting() {
    // Ambient soft room fill
    const roomAmbient = new THREE.AmbientLight(0x28304a, 0.7);
    this.group.add(roomAmbient);

    // Window cool twilight moonlight
    const moonDirectional = new THREE.DirectionalLight(0x60a5fa, 0.9);
    moonDirectional.position.set(6, 6, -3);
    moonDirectional.castShadow = true;
    moonDirectional.shadow.mapSize.width = 1024;
    moonDirectional.shadow.mapSize.height = 1024;
    this.group.add(moonDirectional);

    // Soft warm interior spotlight
    const ceilingSpot = new THREE.SpotLight(0xffedd5, 1.2, 10, Math.PI / 4, 0.4);
    ceilingSpot.position.set(0, 4.5, -0.5);
    ceilingSpot.target = this.characterGroup;
    this.group.add(ceilingSpot);
  }

  buildSteam() {
    const particleCount = 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0.45 + (Math.random() - 0.5) * 0.04;
      positions[i * 3 + 1] = 0.65 + Math.random() * 0.25;
      positions[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.04;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.35
    });

    this.steamParticles = new THREE.Points(geo, mat);
    this.group.add(this.steamParticles);
  }

  triggerEndingPose() {
    this.isEnding = true;
  }

  update(delta) {
    const time = this.clock.getElapsedTime();

    // 1. Natural Breathing & Subtle Idle Animation
    if (this.characterChest && !this.isEnding) {
      // Chest gentle rise and fall
      this.characterChest.position.y = 0.95 + Math.sin(time * 2.2) * 0.008;
      // Head micro sway
      this.characterHead.rotation.x = 0.26 + Math.sin(time * 1.5) * 0.015;
    }

    // 2. Coffee Steam rising
    if (this.steamParticles) {
      const positions = this.steamParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += delta * 0.12;
        positions[i] += Math.sin(time * 3 + i) * 0.001;
        if (positions[i + 1] > 0.95) {
          positions[i + 1] = 0.65;
        }
      }
      this.steamParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Scene 5 Ending Animation: Smile & Put Phone Down
    if (this.isEnding && this.endingProgress < 1.0) {
      this.endingProgress = Math.min(1.0, this.endingProgress + delta * 0.8);
      const p = this.endingProgress;

      // Character sits back with confidence
      this.characterChest.rotation.x = THREE.MathUtils.lerp(0, -0.08, p);
      // Head looks up from screen and smiles
      this.characterHead.rotation.x = THREE.MathUtils.lerp(0.26, -0.1, p);
      this.characterHead.rotation.y = THREE.MathUtils.lerp(0, 0.15, p);

      // Lowers phone onto coffee table
      if (this.phoneMesh) {
        this.phoneMesh.position.y = THREE.MathUtils.lerp(-0.12, -0.38, p);
        this.phoneMesh.position.z = THREE.MathUtils.lerp(0.46, 0.72, p);
        this.phoneMesh.rotation.x = THREE.MathUtils.lerp(0.75, 1.57, p);
      }
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}


  /* --- ROOFTOP SCENE --- */
  

class RooftopScene {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'RooftopScene';

    this.clock = new THREE.Clock();
    this.hotspots = [];
    this.spotlights = [];
    this.candleLights = [];
    this.fireflyParticles = null;
    this.audioWaveMesh = null;
    this.festoonBulbs = [];

    this.buildScene();
  }

  buildScene() {
    // 1. Deck Floor & Balustrade (Warm Honey-Teak Wood)
    this.buildDeckAndPerimeter();

    // 2. Bright Golden Hour Sunset Sky & Surrounding Cityscape
    this.buildSunsetSkyline();

    // 3. Zone 1: Live Music Stage (North: z = -11) - Brightly Lit
    this.buildMusicStage();

    // 4. Zone 2: The Cocktail Bar (West: x = -11) - Glowing Onyx & Glass
    this.buildCocktailBar();

    // 5. Zone 3: Dining & Skyline Seating (East/South) - Warm Radiant Tables
    this.buildSeatingArea();

    // 6. Zone 4: VIP Pergola Lounge - Illuminated Cabana
    this.buildPergolaLounge();

    // 7. Overhead Illuminated Festoon String Lights
    this.buildFestoonLights();

    // 8. Atmospheric Floating Golden Light Motes
    this.buildFloatingMotes();

    // 9. Interactive Hotspots (Stage, Bar, Skyline Table, VIP Lounge)
    this.createHotspots();

    // 10. Powerful Golden Hour Environmental Lighting
    this.setupGoldenHourLighting();
  }

  /* ----------------------------------------------------
     Powerful Golden Hour Environmental Lighting
     "Lit up, not dark"
     ---------------------------------------------------- */
  setupGoldenHourLighting() {
    // Bright warm ambient fill so everything is crisp, clear, and visible
    const ambientLight = new THREE.AmbientLight(0xffecd2, 1.35);
    this.group.add(ambientLight);

    // Warm golden setting sun directional light
    const sunLight = new THREE.DirectionalLight(0xffa244, 2.4);
    sunLight.position.set(18, 22, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.group.add(sunLight);

    // Sky/Ground Hemisphere Light (Warm peach sky, rich terracotta ground)
    const hemiLight = new THREE.HemisphereLight(0xfff0db, 0x854d27, 1.25);
    hemiLight.position.set(0, 30, 0);
    this.group.add(hemiLight);

    // Warm rooftop center flood fill
    const centerWarmLight = new THREE.PointLight(0xffb35a, 2.0, 35, 1.2);
    centerWarmLight.position.set(0, 6.5, 0);
    this.group.add(centerWarmLight);
  }

  /* ----------------------------------------------------
     Deck Flooring & Glass Perimeter Balustrade
     ---------------------------------------------------- */
  buildDeckAndPerimeter() {
    // Warm Honey-Teak Decking with Rich Golden Highlights
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x543522,
      roughness: 0.38,
      metalness: 0.15
    });
    const deckGeo = new THREE.BoxGeometry(34, 0.4, 34);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = -0.2;
    deck.receiveShadow = true;
    this.group.add(deck);

    // Visible Timber Floor Planks
    const plankMat = new THREE.MeshBasicMaterial({ color: 0x3d2315 });
    for (let i = -16; i <= 16; i += 1.2) {
      const plankLine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 33.8), plankMat);
      plankLine.position.set(i, 0.005, 0);
      this.group.add(plankLine);
    }

    // Recessed Warm Golden Floor Strip
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const ledNorth = new THREE.Mesh(new THREE.BoxGeometry(33.6, 0.02, 0.1), ledMat);
    ledNorth.position.set(0, 0.01, -16.6);
    this.group.add(ledNorth);

    const ledSouth = new THREE.Mesh(new THREE.BoxGeometry(33.6, 0.02, 0.1), ledMat);
    ledSouth.position.set(0, 0.01, 16.6);
    this.group.add(ledSouth);

    const ledEast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 33.6), ledMat);
    ledEast.position.set(16.6, 0.01, 0);
    this.group.add(ledEast);

    const ledWest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 33.6), ledMat);
    ledWest.position.set(-16.6, 0.01, 0);
    this.group.add(ledWest);

    // Glass Balustrade Perimeter (Frameless Panoramic Railing)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbedbfe,
      transparent: true,
      opacity: 0.3,
      roughness: 0.08,
      metalness: 0.85,
      transmission: 0.8
    });

    const railingPostMat = new THREE.MeshStandardMaterial({
      color: 0x2b3040,
      metalness: 0.9,
      roughness: 0.2
    });

    const createBalustradeSection = (length, isHorizontal, x, z) => {
      const sectionGroup = new THREE.Group();
      const panelGeo = isHorizontal ? new THREE.BoxGeometry(length, 1.1, 0.04) : new THREE.BoxGeometry(0.04, 1.1, length);
      const glass = new THREE.Mesh(panelGeo, glassMat);
      glass.position.set(x, 0.65, z);
      sectionGroup.add(glass);

      const railGeo = isHorizontal ? new THREE.BoxGeometry(length, 0.06, 0.08) : new THREE.BoxGeometry(0.08, 0.06, length);
      const rail = new THREE.Mesh(railGeo, railingPostMat);
      rail.position.set(x, 1.22, z);
      sectionGroup.add(rail);

      const count = Math.floor(length / 3);
      for (let i = 0; i <= count; i++) {
        const offset = -length / 2 + (i / count) * length;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), railingPostMat);
        if (isHorizontal) {
          post.position.set(x + offset, 0.6, z);
        } else {
          post.position.set(x, 0.6, z + offset);
        }
        sectionGroup.add(post);
      }

      this.group.add(sectionGroup);
    };

    createBalustradeSection(33.6, true, 0, -16.8);
    createBalustradeSection(33.6, true, 0, 16.8);
    createBalustradeSection(33.6, false, 16.8, 0);
    createBalustradeSection(33.6, false, -16.8, 0);
  }

  /* ----------------------------------------------------
     360° Golden-Hour Sunset Sky & Lit-Up Metropolis Skyline
     ---------------------------------------------------- */
  buildSunsetSkyline() {
    const skylineGroup = new THREE.Group();

    // 1. Radiant Sunset Sky Dome
    const skyGeo = new THREE.SphereGeometry(220, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skylineGroup.add(skyDome);

    // Golden Sunset Horizon Glow Ring
    const horizonGeo = new THREE.CylinderGeometry(210, 210, 60, 32, 1, true);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6
    });
    const horizonGlow = new THREE.Mesh(horizonGeo, horizonMat);
    horizonGlow.position.y = 15;
    skylineGroup.add(horizonGlow);

    // Glowing Golden Setting Sun
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20), sunMat);
    sun.position.set(65, 38, -120);
    skylineGroup.add(sun);

    // Sun Corona Flare
    const sunCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xfba24b,
      transparent: true,
      opacity: 0.35
    });
    const sunCorona = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 20), sunCoronaMat);
    sunCorona.position.set(65, 38, -120);
    skylineGroup.add(sunCorona);

    // 2. 50+ Lit-up Skyscrapers with Sunset Window Reflections
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x1e2433,
      roughness: 0.45,
      metalness: 0.35
    });

    const windowColors = [0xfff7ed, 0xfef08a, 0xfde047, 0xfed7aa];
    const numBuildings = 48;
    const radius = 70;

    for (let i = 0; i < numBuildings; i++) {
      const angle = (i / numBuildings) * Math.PI * 2;
      const dist = radius + (Math.sin(i * 3.5) * 16);
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist;

      const width = 9 + Math.random() * 14;
      const depth = 9 + Math.random() * 14;
      const height = 28 + Math.random() * 80;

      const bldg = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bldgMat);
      bldg.position.set(bx, height / 2 - 16, bz);
      skylineGroup.add(bldg);

      // Lit-up Window Grids
      const winPointsGeo = new THREE.BufferGeometry();
      const winPositions = [];
      const numWindows = Math.floor(height * 1.1);
      for (let w = 0; w < numWindows; w++) {
        if (Math.random() > 0.25) {
          const face = Math.random() > 0.5 ? 1 : -1;
          const wy = (w / numWindows) * height - height / 2;
          const wx = bx + (Math.random() - 0.5) * (width * 0.85);
          const wz = bz + (face * (depth / 2 + 0.06));
          winPositions.push(wx, wy + height / 2 - 16, wz);
        }
      }

      if (winPositions.length > 0) {
        winPointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(winPositions, 3));
        const winColor = windowColors[i % windowColors.length];
        const winMat = new THREE.PointsMaterial({
          color: winColor,
          size: 0.5,
          transparent: true,
          opacity: 0.95
        });
        const winPoints = new THREE.Points(winPointsGeo, winMat);
        skylineGroup.add(winPoints);
      }

      // Rooftop Antenna with Warning Beacon
      if (height > 55) {
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.22, 9, 6),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
        );
        antenna.position.set(bx, height - 16 + 4.5, bz);
        skylineGroup.add(antenna);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.set(bx, height - 16 + 9, bz);
        skylineGroup.add(beacon);
      }
    }

    this.group.add(skylineGroup);
  }

  /* ----------------------------------------------------
     Zone 1: Live Music Stage (North: z = -11)
     "The Terrace Social" Stage with Drums, Guitar, Mic
     ---------------------------------------------------- */
  buildMusicStage() {
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 0, -11);

    // Warm Wood Acoustic Stage Platform
    const stagePlatMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e1b,
      roughness: 0.45,
      metalness: 0.2
    });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.65, 5.4), stagePlatMat);
    platform.position.y = 0.325;
    platform.receiveShadow = true;
    stageGroup.add(platform);

    // Steps
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x3b2415, roughness: 0.5 });
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.45), stepMat);
    step1.position.set(0, 0.11, 2.9);
    stageGroup.add(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.44, 0.45), stepMat);
    step2.position.set(0, 0.22, 2.45);
    stageGroup.add(step2);

    // Back Wooden Acoustic Slats Wall
    const slatWallMat = new THREE.MeshStandardMaterial({ color: 0x613d24, roughness: 0.5 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.4, 0.2), slatWallMat);
    backWall.position.set(0, 2.3, -2.5);
    stageGroup.add(backWall);

    // Glowing Warm Backlit Stage Sign: "THE TERRACE SOCIAL"
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffe8ba });
    const signBar = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 0.08), signMat);
    signBar.position.set(0, 3.3, -2.35);
    stageGroup.add(signBar);

    const signLight = new THREE.PointLight(0xffb84d, 2.2, 10);
    signLight.position.set(0, 3.3, -1.8);
    stageGroup.add(signLight);

    // Stage Front Warm Floodlights (bright illumination onto performer)
    const stageWarmSpot1 = new THREE.SpotLight(0xffecd2, 3.2, 18, Math.PI / 4, 0.4);
    stageWarmSpot1.position.set(-2.5, 5.5, 1.5);
    stageWarmSpot1.target.position.set(0, 0.7, -0.5);
    stageGroup.add(stageWarmSpot1);
    stageGroup.add(stageWarmSpot1.target);

    const stageWarmSpot2 = new THREE.SpotLight(0xffd180, 2.8, 18, Math.PI / 4, 0.4);
    stageWarmSpot2.position.set(2.5, 5.5, 1.5);
    stageWarmSpot2.target.position.set(0, 0.7, -0.5);
    stageGroup.add(stageWarmSpot2);
    stageGroup.add(stageWarmSpot2.target);

    // Drum Kit
    this.buildDrumKit(stageGroup, 0, 0.65, -1.0);

    // Marshall-Style Guitar Amps
    this.buildGuitarAmp(stageGroup, -2.8, 0.65, -1.8);
    this.buildGuitarAmp(stageGroup, 2.8, 0.65, -1.8);

    // Acoustic Guitar on Stand
    this.buildAcousticGuitar(stageGroup, -1.8, 0.65, 0.4);

    // Vocal Microphone on Boom Stand
    this.buildMicrophone(stageGroup, 0.6, 0.65, 0.8);

    // Stage Monitor Wedges
    const wedgeMat = new THREE.MeshStandardMaterial({ color: 0x1f242e, roughness: 0.6 });
    const wedge1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.48), wedgeMat);
    wedge1.position.set(-1.4, 0.8, 1.8);
    wedge1.rotation.x = -0.3;
    stageGroup.add(wedge1);

    const wedge2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.48), wedgeMat);
    wedge2.position.set(1.4, 0.8, 1.8);
    wedge2.rotation.x = -0.3;
    stageGroup.add(wedge2);

    this.group.add(stageGroup);
  }

  buildDrumKit(parent, x, y, z) {
    const drumGroup = new THREE.Group();
    drumGroup.position.set(x, y, z);

    const shellMat = new THREE.MeshStandardMaterial({ color: 0xb43418, metalness: 0.4, roughness: 0.3 }); // Terracotta red drum shell
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });

    // Bass Drum (Kick)
    const kick = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.65, 24), shellMat);
    kick.rotation.x = Math.PI / 2;
    kick.position.set(0, 0.58, 0);
    drumGroup.add(kick);

    // Snare Drum
    const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 20), shellMat);
    snare.position.set(-0.65, 0.78, 0.25);
    drumGroup.add(snare);

    const snareStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.68, 8), chromeMat);
    snareStand.position.set(-0.65, 0.34, 0.25);
    drumGroup.add(snareStand);

    // Rack Toms
    const tom1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.25, 16), shellMat);
    tom1.position.set(-0.3, 1.15, -0.1);
    tom1.rotation.z = -0.2;
    drumGroup.add(tom1);

    const tom2 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.26, 16), shellMat);
    tom2.position.set(0.3, 1.15, -0.1);
    tom2.rotation.z = 0.2;
    drumGroup.add(tom2);

    // Hi-Hat Cymbals
    const hihatTop = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.05, 20), brassMat);
    hihatTop.position.set(-1.1, 0.98, 0.2);
    drumGroup.add(hihatTop);

    const hihatStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), chromeMat);
    hihatStand.position.set(-1.1, 0.5, 0.2);
    drumGroup.add(hihatStand);

    // Crash Cymbal
    const crash = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.06, 20), brassMat);
    crash.position.set(1.15, 1.35, -0.1);
    crash.rotation.z = -0.2;
    drumGroup.add(crash);

    const crashStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.35, 8), chromeMat);
    crashStand.position.set(1.15, 0.67, -0.1);
    drumGroup.add(crashStand);

    parent.add(drumGroup);
  }

  buildGuitarAmp(parent, x, y, z) {
    const ampGroup = new THREE.Group();
    ampGroup.position.set(x, y, z);

    const ampBoxMat = new THREE.MeshStandardMaterial({ color: 0x1f242e, roughness: 0.7 });
    const ampGrillMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.45), ampBoxMat);
    cabinet.position.y = 0.525;
    ampGroup.add(cabinet);

    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.8), ampGrillMat);
    grill.position.set(0, 0.5, 0.23);
    ampGroup.add(grill);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    led.position.set(0.32, 0.95, 0.23);
    ampGroup.add(led);

    parent.add(ampGroup);
  }

  buildAcousticGuitar(parent, x, y, z) {
    const gGroup = new THREE.Group();
    gGroup.position.set(x, y, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.1 });
    const neckMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });

    const bodyBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16), woodMat);
    bodyBottom.rotation.x = Math.PI / 2;
    bodyBottom.position.set(0, 0.45, 0);
    gGroup.add(bodyBottom);

    const bodyTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 16), woodMat);
    bodyTop.rotation.x = Math.PI / 2;
    bodyTop.position.set(0, 0.72, 0);
    gGroup.add(bodyTop);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.04), neckMat);
    neck.position.set(0, 1.05, 0);
    gGroup.add(neck);

    const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.04), woodMat);
    headstock.position.set(0, 1.35, 0);
    gGroup.add(headstock);

    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), standMat);
    stand.position.set(0, 0.4, -0.15);
    stand.rotation.x = -0.15;
    gGroup.add(stand);

    gGroup.rotation.y = 0.4;
    parent.add(gGroup);
  }

  buildMicrophone(parent, x, y, z) {
    const micGroup = new THREE.Group();
    micGroup.position.set(x, y, z);

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 16), chromeMat);
    base.position.y = 0.02;
    micGroup.add(base);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), chromeMat);
    shaft.position.y = 0.65;
    micGroup.add(shaft);

    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8), chromeMat);
    boom.position.set(0.12, 1.35, 0.15);
    boom.rotation.set(-0.5, 0, 0.4);
    micGroup.add(boom);

    const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), chromeMat);
    capsule.position.set(0.24, 1.52, 0.28);
    micGroup.add(capsule);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
    this.audioWaveMesh = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 16), ringMat);
    this.audioWaveMesh.position.set(0.24, 1.52, 0.28);
    this.audioWaveMesh.rotation.x = Math.PI / 2;
    micGroup.add(this.audioWaveMesh);

    parent.add(micGroup);
  }

  /* ----------------------------------------------------
     Zone 2: The Cocktail Bar (West: x = -11)
     Lit-up Golden Onyx Bar, Glowing Bottle Shelves
     ---------------------------------------------------- */
  buildCocktailBar() {
    const barGroup = new THREE.Group();
    barGroup.position.set(-11, 0, 0);

    // Warm Golden Marble Countertop
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0x3d271d,
      roughness: 0.2,
      metalness: 0.15
    });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 10.5), marbleMat);
    counter.position.y = 0.575;
    counter.castShadow = true;
    counter.receiveShadow = true;
    barGroup.add(counter);

    // Brass Footrest Rail
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const footrail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10.2, 12), brassMat);
    footrail.position.set(0.78, 0.22, 0);
    footrail.rotation.x = Math.PI / 2;
    barGroup.add(footrail);

    // Under-counter Bright Golden LED Strip
    const underLed = new THREE.PointLight(0xffb74d, 2.4, 7);
    underLed.position.set(0.75, 0.85, 0);
    barGroup.add(underLed);

    // Back-Bar Shelving Wall
    const backWallMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.6 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 9.8), backWallMat);
    backWall.position.set(-1.8, 1.8, 0);
    barGroup.add(backWall);

    // 3 Tiered Glass Shelves
    const shelfMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.8
    });

    const bottleColors = [0xf59e0b, 0x10b981, 0xef4444, 0x3b82f6, 0xec4899, 0xf97316];

    for (let shelf = 0; shelf < 3; shelf++) {
      const shelfY = 1.0 + shelf * 0.75;
      const glassShelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 9.2), shelfMat);
      glassShelf.position.set(-1.5, shelfY, 0);
      barGroup.add(glassShelf);

      // Backlit Light on Shelves
      const shelfLight = new THREE.PointLight(0xffd180, 1.2, 5);
      shelfLight.position.set(-1.6, shelfY + 0.15, 0);
      barGroup.add(shelfLight);

      // 14 Glowing Liquor Bottles per shelf
      for (let b = 0; b < 14; b++) {
        const bZ = -4.2 + (b / 14) * 8.4;
        const bColor = bottleColors[(shelf * 3 + b) % bottleColors.length];
        const bottleMat = new THREE.MeshStandardMaterial({
          color: bColor,
          roughness: 0.15,
          metalness: 0.1,
          transparent: true,
          opacity: 0.9
        });
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 10), bottleMat);
        bottle.position.set(-1.5, shelfY + 0.16, bZ);
        barGroup.add(bottle);
      }
    }

    // 5 Swivel Leather Barstools
    const stoolLeatherMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    for (let s = -2; s <= 2; s++) {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(1.4, 0, s * 1.8);

      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), stoolLeatherMat);
      seat.position.y = 0.78;
      seat.castShadow = true;
      stoolGroup.add(seat);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.76, 8), brassMat);
      leg.position.y = 0.38;
      stoolGroup.add(leg);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 16), brassMat);
      base.position.y = 0.02;
      stoolGroup.add(base);

      barGroup.add(stoolGroup);
    }

    // Cocktail Shaker
    const shakerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.24, 14), shakerMat);
    shaker.position.set(0.1, 1.27, -0.6);
    barGroup.add(shaker);

    this.group.add(barGroup);
  }

  /* ----------------------------------------------------
     Zone 3: Dining Tables & Skyline Seating (East & South)
     ---------------------------------------------------- */
  buildSeatingArea() {
    const diningGroup = new THREE.Group();

    const tablePositions = [
      [11, 0, -4],
      [11, 0, 4],
      [7, 0, 9],
      [-5, 0, 11]
    ];

    tablePositions.forEach((pos, idx) => {
      this.buildDiningTableSet(diningGroup, pos[0], pos[1], pos[2], idx === 1 /* Table 14 */);
    });

    this.buildPatioHeater(diningGroup, 12, 0, 0);
    this.buildPatioHeater(diningGroup, 3, 0, 12);

    this.group.add(diningGroup);
  }

  buildDiningTableSet(parent, x, y, z, isTable14 = false) {
    const setGroup = new THREE.Group();
    setGroup.position.set(x, y, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3921, roughness: 0.45 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2b3040, metalness: 0.8, roughness: 0.3 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.4), woodMat);
    top.position.y = 0.74;
    top.castShadow = true;
    top.receiveShadow = true;
    setGroup.add(top);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), metalMat);
    leg.position.y = 0.36;
    setGroup.add(leg);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.65), metalMat);
    base.position.y = 0.015;
    setGroup.add(base);

    const chairOffsets = [
      [0, -1.0, 0],
      [0, 1.0, Math.PI],
      [-1.0, 0, Math.PI / 2],
      [1.0, 0, -Math.PI / 2]
    ];

    chairOffsets.forEach(([cx, cz, rot]) => {
      const chair = new THREE.Group();
      chair.position.set(cx, 0, cz);
      chair.rotation.y = rot;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.48), cushionMat);
      seat.position.y = 0.45;
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.06), woodMat);
      back.position.set(0, 0.68, -0.22);
      chair.add(back);

      setGroup.add(chair);
    });

    // Flickering Warm Candle Lantern
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), lanternMat);
    lantern.position.set(0, 0.88, 0);
    setGroup.add(lantern);

    const candleLight = new THREE.PointLight(0xffa834, 1.8, 5.5);
    candleLight.position.set(0, 0.92, 0);
    setGroup.add(candleLight);
    this.candleLights.push(candleLight);

    if (isTable14) {
      const tagMat = new THREE.MeshBasicMaterial({ color: 0xb43418 });
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), tagMat);
      tag.position.set(0.4, 0.79, 0.4);
      setGroup.add(tag);
    }

    parent.add(setGroup);
  }

  buildPatioHeater(parent, x, y, z) {
    const heaterGroup = new THREE.Group();
    heaterGroup.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.45, 16), metalMat);
    base.position.y = 0.225;
    heaterGroup.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), metalMat);
    pole.position.y = 1.45;
    heaterGroup.add(pole);

    const heaterTube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12), glowMat);
    heaterTube.position.y = 2.4;
    heaterGroup.add(heaterTube);

    const reflector = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.15, 20), metalMat);
    reflector.position.y = 2.65;
    heaterGroup.add(reflector);

    const heaterLight = new THREE.PointLight(0xff6600, 2.0, 8);
    heaterLight.position.y = 2.4;
    heaterGroup.add(heaterLight);

    parent.add(heaterGroup);
  }

  /* ----------------------------------------------------
     Zone 4: VIP Pergola Lounge
     ---------------------------------------------------- */
  buildPergolaLounge() {
    const pergolaGroup = new THREE.Group();
    pergolaGroup.position.set(7, 0, -8);

    const beamMat = new THREE.MeshStandardMaterial({ color: 0x222a38, metalness: 0.7, roughness: 0.3 });

    const postGeo = new THREE.BoxGeometry(0.14, 3.2, 0.14);
    const postPositions = [
      [-2.4, 1.6, -2.4],
      [2.4, 1.6, -2.4],
      [-2.4, 1.6, 2.4],
      [2.4, 1.6, 2.4]
    ];
    postPositions.forEach(p => {
      const post = new THREE.Mesh(postGeo, beamMat);
      post.position.set(...p);
      pergolaGroup.add(post);
    });

    for (let s = -2.2; s <= 2.2; s += 0.5) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 0.08), beamMat);
      slat.position.set(0, 3.25, s);
      pergolaGroup.add(slat);
    }

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x273142, roughness: 0.7 });

    const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 1.0), sofaMat);
    sofaMain.position.set(0, 0.25, -1.6);
    pergolaGroup.add(sofaMain);

    const sofaReturn = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 2.4), sofaMat);
    sofaReturn.position.set(-1.3, 0.25, 0.1);
    pergolaGroup.add(sofaReturn);

    // Terracotta & Amber Throw Pillows
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.18), new THREE.MeshStandardMaterial({ color: 0xb43418 }));
    p1.position.set(-1.2, 0.6, -1.4);
    p1.rotation.set(0.1, 0.4, 0);
    pergolaGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.18), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    p2.position.set(0.8, 0.6, -1.4);
    p2.rotation.set(0.1, -0.3, 0);
    pergolaGroup.add(p2);

    const lowTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 1.0), new THREE.MeshStandardMaterial({ color: 0x5a3921, roughness: 0.5 }));
    lowTable.position.set(0.2, 0.16, 0.2);
    pergolaGroup.add(lowTable);

    // Warm Overhead Pergola Chandelier Light
    const pergolaLight = new THREE.PointLight(0xffcf70, 2.2, 9);
    pergolaLight.position.set(0, 2.9, 0);
    pergolaGroup.add(pergolaLight);

    this.group.add(pergolaGroup);
  }

  /* ----------------------------------------------------
     Overhead Festoon String Lights (Bright & Radiant)
     ---------------------------------------------------- */
  buildFestoonLights() {
    const festoonGroup = new THREE.Group();

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffb74d,
      emissiveIntensity: 2.2
    });

    const spans = [
      [[-16, 4.0, -12], [16, 4.0, -12]],
      [[-16, 4.2, -3], [16, 4.2, -3]],
      [[-16, 4.2, 6], [16, 4.2, 6]],
      [[-16, 4.0, 14], [16, 4.0, 14]]
    ];

    spans.forEach(([start, end], spanIdx) => {
      const numBulbs = 10;
      for (let b = 0; b <= numBulbs; b++) {
        const t = b / numBulbs;
        const bx = THREE.MathUtils.lerp(start[0], end[0], t);
        const bz = THREE.MathUtils.lerp(start[2], end[2], t);
        const sag = Math.sin(t * Math.PI) * 0.65;
        const by = start[1] - sag;

        // Bulb Mesh
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bulbMat);
        bulb.position.set(bx, by, bz);
        festoonGroup.add(bulb);
        this.festoonBulbs.push(bulb);

        // Every 2nd bulb gets a real warm point light for bright, illuminated terrace
        if (b % 2 === 1) {
          const ptLight = new THREE.PointLight(0xffb84d, 1.4, 7.5);
          ptLight.position.set(bx, by - 0.15, bz);
          festoonGroup.add(ptLight);
        }
      }
    });

    this.group.add(festoonGroup);
  }

  /* ----------------------------------------------------
     Atmospheric Floating Golden Light Motes
     ---------------------------------------------------- */
  buildFloatingMotes() {
    const moteCount = 140;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(moteCount * 3);

    for (let i = 0; i < moteCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = 0.5 + Math.random() * 5.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffe082,
      size: 0.14,
      transparent: true,
      opacity: 0.8
    });

    this.fireflyParticles = new THREE.Points(geo, mat);
    this.group.add(this.fireflyParticles);
  }

  /* ----------------------------------------------------
     Interactive 3D Hotspots
     ---------------------------------------------------- */
  createHotspots() {
    const hotspotData = [
      {
        id: 'stage',
        name: 'Live Music Stage & Artists',
        position: new THREE.Vector3(0, 1.2, -10.5),
        category: 'Live Acoustic Performance',
        icon: '🎸',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'Featuring Indie acoustic duo Aarav & Maya. Intimate sound design tuned for warm vocals, acoustic guitar, and rooftop sunset energy.',
        details: [
          { label: 'Set Times', val: '8:00 PM & 10:15 PM' },
          { label: 'Acoustics', val: 'Line-Array Tuned' },
          { label: 'Vibe', val: 'Soulful & Chill' },
          { label: 'Cover Charge', val: '₹499 (100% Redeemable)' }
        ]
      },
      {
        id: 'bar',
        name: 'The Mixology Cocktail Bar',
        position: new THREE.Vector3(-10.2, 1.2, 0),
        category: 'Artisanal Cocktails',
        icon: '🍸',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'Craft mixology program curated with botanical infusions, smoked single malts, and zero-proof elixirs prepared by senior mixologist Rohan.',
        details: [
          { label: 'Signature', val: 'Smoked Rosemary Mezcal' },
          { label: 'Happy Hours', val: 'Till 9:00 PM (1+1)' },
          { label: 'Bar Seating', val: '5 Plush High Stools' },
          { label: 'House Brew', val: 'Included with ticket' }
        ]
      },
      {
        id: 'skyline',
        name: 'Skyline Sunset Table 14',
        position: new THREE.Vector3(11.0, 1.2, 4.0),
        category: 'Panoramic Cityscape View',
        icon: '🌃',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'The most requested table at The Terrace Social. Unobstructed 180-degree view of the metropolitan skyline with dedicated candlelit ambience.',
        details: [
          { label: 'View Angle', val: '180° East Metro' },
          { label: 'Capacity', val: '2 - 4 Guests' },
          { label: 'Status', val: 'Confirmed with Ticket' },
          { label: 'Sunset Vibe', val: 'Golden Hour Peak' }
        ]
      },
      {
        id: 'pergola',
        name: 'VIP Pergola Cabana',
        position: new THREE.Vector3(7.0, 1.2, -8.0),
        category: 'Private Group Lounge',
        icon: '🌿',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'Secluded steel cabana with plush velvet seating, dedicated server, and crystal-clear acoustic sightlines to the live stage.',
        details: [
          { label: 'Capacity', val: 'Up to 8 Guests' },
          { label: 'Bottle Service', val: 'Priority Access' },
          { label: 'Privacy', val: 'Draped Linen Curtains' },
          { label: 'Deck Access', val: 'VIP Front Stage' }
        ]
      }
    ];

    hotspotData.forEach(data => {
      const pinGroup = new THREE.Group();
      pinGroup.position.copy(data.position);

      const pinMat = new THREE.MeshBasicMaterial({ color: 0xb43418 });
      const pinMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), pinMat);
      pinMesh.position.y = 0.5;
      pinGroup.add(pinMesh);

      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.85 });
      const haloRing = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.44, 16), ringMat);
      haloRing.position.y = 0.5;
      haloRing.rotation.x = Math.PI / 2;
      pinGroup.add(haloRing);

      const groundRingMat = new THREE.MeshBasicMaterial({ color: 0xb43418, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const groundRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 24), groundRingMat);
      groundRing.position.y = -data.position.y + 0.05;
      groundRing.rotation.x = -Math.PI / 2;
      pinGroup.add(groundRing);

      this.group.add(pinGroup);

      data.meshGroup = pinGroup;
      data.haloRing = haloRing;
      data.groundRing = groundRing;
      this.hotspots.push(data);
    });
  }

  update(delta) {
    const time = this.clock.getElapsedTime();

    this.candleLights.forEach((candle, idx) => {
      candle.intensity = 1.6 + Math.sin(time * 7.0 + idx * 3.5) * 0.35;
    });

    if (this.audioWaveMesh) {
      const waveScale = 1.0 + Math.abs(Math.sin(time * 6.0)) * 0.5;
      this.audioWaveMesh.scale.set(waveScale, waveScale, 1);
    }

    if (this.fireflyParticles) {
      const positions = this.fireflyParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time * 1.5 + i) * 0.005;
        positions[i] += Math.cos(time * 1.2 + i) * 0.003;
      }
      this.fireflyParticles.geometry.attributes.position.needsUpdate = true;
    }

    this.hotspots.forEach((hs, idx) => {
      if (hs.meshGroup) {
        hs.meshGroup.position.y = hs.position.y + Math.sin(time * 2.8 + idx * 1.5) * 0.12;
      }
      if (hs.haloRing) {
        hs.haloRing.rotation.z += delta * 1.4;
      }
      if (hs.groundRing) {
        const pulse = 1.0 + Math.sin(time * 3.5 + idx) * 0.2;
        hs.groundRing.scale.set(pulse, pulse, 1);
      }
    });
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}


  /* --- GAME CONTROLS --- */
  


class GameControls {
  constructor(camera, domElement, onInspectHotspot, onExitExperience) {
    this.camera = camera;
    this.domElement = domElement;
    this.onInspectHotspot = onInspectHotspot;
    this.onExitExperience = onExitExperience;

    this.enabled = false;
    this.isPointerLocked = false;
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;

    // Physics & velocity
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.walkSpeed = 6.0;
    this.sprintSpeed = 10.5;
    this.damping = 10.0;
    this.playerHeight = 1.7;

    // Rotation (Euler pitch & yaw)
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.minPolarAngle = -Math.PI / 2.3; // Look down clamp
    this.maxPolarAngle = Math.PI / 2.3;  // Look up clamp

    // Head bobbing
    this.bobTimer = 0;
    this.bobIntensity = 0.045;
    this.bobFrequency = 9.0;

    // Hotspot detection
    this.hotspots = [];
    this.nearbyHotspot = null;
    this.proximityDistance = 4.2;

    // Rooftop bounds
    this.bounds = {
      minX: -16.5,
      maxX: 16.5,
      minZ: -16.5,
      maxZ: 16.5
    };

    // Solid obstacle bounding boxes (Bar counter, Stage steps)
    this.obstacles = [
      // Bar counter box: x from -14 to -9, z from -7 to 7
      new THREE.Box3(new THREE.Vector3(-14, 0, -7.5), new THREE.Vector3(-9, 3, 7.5)),
      // Stage platform box: x from -5 to 5, z from -15 to -8.5
      new THREE.Box3(new THREE.Vector3(-5.2, 0, -15), new THREE.Vector3(5.2, 2.5, -8.2))
    ];

    this.bindEvents();
  }

  setHotspots(hotspots) {
    this.hotspots = hotspots;
  }

  bindEvents() {
    // Keyboard keydown
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = true;
          break;
        case 'KeyE':
          if (this.nearbyHotspot) {
            this.inspect(this.nearbyHotspot);
          }
          break;
        case 'KeyQ':
          if (this.onExitExperience) {
            this.onExitExperience();
          }
          break;
      }
    });

    // Keyboard keyup
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = false;
          break;
      }
    });

    // Pointer Lock & Click to look
    this.domElement.addEventListener('click', (e) => {
      if (!this.enabled) return;
      if (!document.pointerLockElement) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;

      if (this.isPointerLocked) {
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;
        this.applyLook(movementX * 0.0022, movementY * 0.0022);
      } else if (this.isDragging) {
        const deltaX = e.clientX - this.prevMousePos.x;
        const deltaY = e.clientY - this.prevMousePos.y;
        this.applyLook(deltaX * 0.003, deltaY * 0.003);
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    // Drag look fallbacks (for non-pointerlock or touch trackpads)
    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      this.isDragging = true;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    this.domElement.addEventListener('touchstart', (e) => {
      if (!this.enabled || e.touches.length === 0) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (!this.enabled || e.touches.length === 0) return;
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      this.applyLook(deltaX * 0.004, deltaY * 0.004);
      touchStartX = touchX;
      touchStartY = touchY;
    }, { passive: true });
  }

  applyLook(yawDelta, pitchDelta) {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= yawDelta;
    this.euler.x -= pitchDelta;
    this.euler.x = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  inspect(hotspot) {
    sound.playHotspotInspect();
    if (this.onInspectHotspot) {
      this.onInspectHotspot(hotspot);
    }
  }

  update(delta) {
    if (!this.enabled) return;

    // Damping / friction
    this.velocity.x -= this.velocity.x * this.damping * delta;
    this.velocity.z -= this.velocity.z * this.damping * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * 8.0 * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * 8.0 * delta;
    }

    // Move relative to camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);
    const side = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);

    const displacement = new THREE.Vector3();
    displacement.addScaledVector(forward, -this.velocity.z * delta);
    displacement.addScaledVector(side, -this.velocity.x * delta);

    // Tentative new position
    const nextPos = this.camera.position.clone().add(displacement);

    // Rooftop perimeter boundary clamp
    nextPos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, nextPos.x));
    nextPos.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, nextPos.z));

    // Obstacle collision resolution (cylinder check against AABB)
    let collided = false;
    const playerCylinder = new THREE.Sphere(nextPos, 0.45);
    for (const box of this.obstacles) {
      if (box.intersectsSphere(playerCylinder)) {
        collided = true;
        break;
      }
    }

    if (!collided) {
      this.camera.position.x = nextPos.x;
      this.camera.position.z = nextPos.z;
    }

    // Subtle head bobbing when moving
    const moving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (moving && this.velocity.length() > 0.1) {
      this.bobTimer += delta * (this.isSprinting ? this.bobFrequency * 1.3 : this.bobFrequency);
      this.camera.position.y = this.playerHeight + Math.sin(this.bobTimer) * this.bobIntensity;
    } else {
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.playerHeight, delta * 6);
    }

    // Update 3D audio listener position
    sound.updateSpatialAudio(this.camera.position);

    // Check proximity to hotspots
    this.checkHotspotProximity();
  }

  checkHotspotProximity() {
    let closest = null;
    let closestDist = Infinity;

    for (const hotspot of this.hotspots) {
      const d = this.camera.position.distanceTo(hotspot.position);
      if (d < this.proximityDistance && d < closestDist) {
        closest = hotspot;
        closestDist = d;
      }
    }

    this.nearbyHotspot = closest;

    // Update HUD Prompt
    const promptElem = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('interact-text');
    const crosshair = document.querySelector('.crosshair');

    if (closest) {
      if (promptElem && promptText) {
        promptText.textContent = `[E] Inspect ${closest.name}`;
        promptElem.classList.add('visible');
      }
      if (crosshair) crosshair.classList.add('hovered');
    } else {
      if (promptElem) promptElem.classList.remove('visible');
      if (crosshair) crosshair.classList.remove('hovered');
    }
  }

  resetPosition(x = 0, z = 8, yaw = 0) {
    this.camera.position.set(x, this.playerHeight, z);
    this.euler.set(0, yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
    this.velocity.set(0, 0, 0);
  }
}


  /* --- PHONE UI MANAGER --- */
  

class PhoneUIManager {
  constructor(callbacks) {
    this.callbacks = callbacks || {};

    // Booking selections state matching user screens
    this.selectedDate = 'Today, 24 Oct';
    this.selectedTime = '8:00 PM – 10:00 PM';
    this.selectedDeck = 'Front Stage Deck';
    this.guestCount = 2;
    this.pricePerGuest = 499;
    this.gstFee = 8;

    this.currentStep = 1; // 1: Slot, 2: Confirmation, 3: Payment, 4: Success Ticket

    this.initDOMElements();
  }

  initDOMElements() {
    this.phoneContainer = document.getElementById('phone-container');
    this.phoneScreen = document.getElementById('phone-screen');
    this.hotspotModalBackdrop = document.getElementById('hotspot-modal-backdrop');
    this.endingShowcase = document.getElementById('ending-showcase');

    this.bindEvents();
  }

  bindEvents() {
    // 1. "Explore in 3D" & "Preview →" Buttons in Spot Details
    const exploreCard = document.getElementById('explore-3d-card');
    const previewBtn = document.getElementById('preview-3d-btn');

    const start3D = () => {
      sound.playClick();
      sound.playTransitionWhoosh(true);
      if (this.callbacks.onStart3DExploration) {
        this.callbacks.onStart3DExploration();
      }
    };

    if (exploreCard) exploreCard.addEventListener('click', start3D);
    if (previewBtn) previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      start3D();
    });

    // 2. "Book experience →" CTA in Spot Details -> Opens Step 1
    const bookExpBtn = document.getElementById('btn-book-experience');
    if (bookExpBtn) {
      bookExpBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToStep(1);
      });
    }

    // 3. Step 1: Date Pills
    document.querySelectorAll('.date-select-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.date-select-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedDate = pill.dataset.val;
        sound.playClick();
      });
    });

    // 4. Step 1: Time Slot Selection
    document.querySelectorAll('.time-slot-card').forEach(slot => {
      slot.addEventListener('click', () => {
        document.querySelectorAll('.time-slot-card').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        this.selectedTime = slot.dataset.val;
        sound.playClick();
      });
    });

    // 5. Step 1: Guest Counter (+ / -)
    const btnMinus = document.getElementById('btn-guest-minus');
    const btnPlus = document.getElementById('btn-guest-plus');
    const guestDisplay = document.getElementById('guest-count-val');

    if (btnMinus && btnPlus && guestDisplay) {
      btnMinus.addEventListener('click', () => {
        if (this.guestCount > 1) {
          this.guestCount--;
          guestDisplay.textContent = this.guestCount;
          this.updateTotals();
          sound.playClick();
        }
      });

      btnPlus.addEventListener('click', () => {
        if (this.guestCount < 8) {
          this.guestCount++;
          guestDisplay.textContent = this.guestCount;
          this.updateTotals();
          sound.playClick();
        }
      });
    }

    // 6. Step 1 -> Step 2: "Review Booking →"
    const reviewBookingBtn = document.getElementById('btn-review-booking');
    if (reviewBookingBtn) {
      reviewBookingBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToStep(2);
      });
    }

    // 7. Step 2 -> Step 3: "Continue to Payment →"
    const continuePayBtn = document.getElementById('btn-continue-payment');
    if (continuePayBtn) {
      continuePayBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToStep(3);
      });
    }

    // 8. Step 3: UPI Selection
    document.querySelectorAll('.upi-row').forEach(row => {
      row.addEventListener('click', () => {
        document.querySelectorAll('.upi-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        sound.playClick();
      });
    });

    // 9. Step 3 -> Step 4: "Pay ₹1,006 via Google Pay"
    const payBtn = document.getElementById('btn-pay-upi');
    if (payBtn) {
      payBtn.addEventListener('click', () => {
        this.executePaymentSuccess();
      });
    }

    // 10. Step 4 -> Scene 5: "View in My Bookings →"
    const viewBookingsBtn = document.getElementById('btn-view-bookings');
    if (viewBookingsBtn) {
      viewBookingsBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onFinishBooking) {
          this.callbacks.onFinishBooking();
        }
      });
    }

    // 11. Back button handling inside phone
    const backBtn = document.getElementById('phone-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.currentStep > 1 && this.currentStep < 4) {
          this.goToStep(this.currentStep - 1);
        } else {
          this.showScene1();
        }
      });
    }

    // 12. Hotspot Modals
    const closeModalBtn = document.getElementById('close-hotspot-modal');
    const modalResumeBtn = document.getElementById('modal-resume-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeHotspotModal());
    if (modalResumeBtn) modalResumeBtn.addEventListener('click', () => this.closeHotspotModal());

    const modalBookBtn = document.getElementById('modal-book-now-btn');
    if (modalBookBtn) {
      modalBookBtn.addEventListener('click', () => {
        this.closeHotspotModal();
        if (this.callbacks.onReturnToPhone) {
          this.callbacks.onReturnToPhone();
        }
      });
    }

    // 13. Scene 5 Ending Navigation Buttons
    const replayBtn = document.getElementById('btn-replay-experience');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onReplay) {
          this.callbacks.onReplay();
        }
      });
    }

    const jump3DBtn = document.getElementById('btn-jump-3d');
    if (jump3DBtn) {
      jump3DBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onStart3DExploration) {
          this.callbacks.onStart3DExploration();
        }
      });
    }

    const jumpPhoneBtn = document.getElementById('btn-jump-phone');
    if (jumpPhoneBtn) {
      jumpPhoneBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.callbacks.onReturnToPhone) {
          this.callbacks.onReturnToPhone();
        }
      });
    }
  }

  updateTotals() {
    const subtotal = this.guestCount * this.pricePerGuest;
    const totalWithTax = subtotal + this.gstFee;

    const subtotalDisplays = document.querySelectorAll('.subtotal-display');
    subtotalDisplays.forEach(el => el.textContent = `₹${subtotal}`);

    const totalDisplays = document.querySelectorAll('.total-display');
    totalDisplays.forEach(el => el.textContent = `₹${totalWithTax}`);

    const guestTextDisplays = document.querySelectorAll('.guest-count-text');
    guestTextDisplays.forEach(el => el.textContent = `${this.guestCount} Guests`);

    const guestCalcNote = document.getElementById('guest-calc-note');
    if (guestCalcNote) {
      guestCalcNote.textContent = `₹499 x ${this.guestCount} = ₹${subtotal}`;
    }
  }

  goToStep(stepNum) {
    this.currentStep = stepNum;

    // Hide all views
    document.getElementById('discovery-view').style.display = 'none';
    document.getElementById('booking-step1-view').style.display = 'none';
    document.getElementById('booking-step2-view').style.display = 'none';
    document.getElementById('booking-step3-view').style.display = 'none';
    document.getElementById('booking-step4-view').style.display = 'none';
    if (this.endingShowcase) this.endingShowcase.classList.remove('active');

    // Show selected step view
    if (stepNum === 1) {
      document.getElementById('booking-step1-view').style.display = 'block';
    } else if (stepNum === 2) {
      document.getElementById('booking-step2-view').style.display = 'block';
    } else if (stepNum === 3) {
      document.getElementById('booking-step3-view').style.display = 'block';
    } else if (stepNum === 4) {
      document.getElementById('booking-step4-view').style.display = 'block';
    }

    this.updateTotals();
    this.phoneScreen.scrollTop = 0;
  }

  showScene1() {
    this.phoneContainer.classList.remove('minimized');
    document.getElementById('discovery-view').style.display = 'block';
    document.getElementById('booking-step1-view').style.display = 'none';
    document.getElementById('booking-step2-view').style.display = 'none';
    document.getElementById('booking-step3-view').style.display = 'none';
    document.getElementById('booking-step4-view').style.display = 'none';
    if (this.endingShowcase) this.endingShowcase.classList.remove('active');
    this.phoneScreen.scrollTop = 0;
  }

  minimizePhone() {
    this.phoneContainer.classList.add('minimized');
  }

  showScene4Booking() {
    this.phoneContainer.classList.remove('minimized');
    this.goToStep(1); // Return directly to booking step 1
  }

  executePaymentSuccess() {
    sound.playBookingCelebration();
    this.triggerConfetti();
    this.goToStep(4);
  }

  triggerConfetti() {
    const colors = ['#b43418', '#f59e0b', '#10b981', '#3b82f6', '#ea580c'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.style.position = 'absolute';
      c.style.top = '40%';
      c.style.left = '50%';
      c.style.width = `${Math.random() * 8 + 6}px`;
      c.style.height = `${Math.random() * 10 + 6}px`;
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.borderRadius = '3px';
      c.style.zIndex = '99';
      c.style.pointerEvents = 'none';
      document.body.appendChild(c);

      const destX = (Math.random() - 0.5) * window.innerWidth * 0.7;
      const destY = (Math.random() - 0.7) * window.innerHeight * 0.8;
      const rot = Math.random() * 720;

      c.animate([
        { transform: 'translate(0, 0) scale(0)', opacity: 1 },
        { transform: `translate(${destX}px, ${destY}px) rotate(${rot}deg) scale(1)`, opacity: 0 }
      ], {
        duration: 1800 + Math.random() * 800,
        easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
        fill: 'forwards'
      }).onfinish = () => c.remove();
    }
  }

  showEndingScreen() {
    this.phoneContainer.classList.add('minimized');
    if (this.endingShowcase) {
      this.endingShowcase.classList.add('active');
    }
  }

  openHotspotModal(hotspot) {
    if (!this.hotspotModalBackdrop) return;

    document.getElementById('modal-hotspot-title').textContent = hotspot.name;
    document.getElementById('modal-hotspot-category').textContent = hotspot.category;
    document.getElementById('modal-hotspot-desc').textContent = hotspot.description;

    const heroImg = document.getElementById('modal-hotspot-img');
    if (heroImg) heroImg.src = hotspot.heroImage;

    const featuresList = document.getElementById('modal-features-list');
    if (featuresList) {
      featuresList.innerHTML = '';
      hotspot.details.forEach(item => {
        const div = document.createElement('div');
        div.className = 'hotspot-feature-item';
        div.innerHTML = `<strong>${item.label}:</strong> <span>${item.val}</span>`;
        featuresList.appendChild(div);
      });
    }

    this.hotspotModalBackdrop.classList.add('open');
  }

  closeHotspotModal() {
    if (this.hotspotModalBackdrop) {
      this.hotspotModalBackdrop.classList.remove('open');
    }
  }
}


  /* --- MAIN GAME APP --- */
  






// Game Storyline States
const STATE = {
  SCENE_1_PHONE: 'SCENE_1_PHONE',
  TRANSITION_TO_3D: 'TRANSITION_TO_3D',
  SCENE_2_3_ROOFTOP: 'SCENE_2_3_ROOFTOP',
  TRANSITION_TO_PHONE: 'TRANSITION_TO_PHONE',
  SCENE_4_BOOKING: 'SCENE_4_BOOKING',
  SCENE_5_ENDING: 'SCENE_5_ENDING'
};

class LocalLoopGameApp {
  constructor() {
    this.currentState = STATE.SCENE_1_PHONE;
    this.clock = new THREE.Clock();

    // Three.js Core
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x2a1c24, 0.008); // Warm sunset golden fog

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer = null;

    // Subscenes
    this.apartment = null;
    this.rooftop = null;
    this.controls = null;
    this.phoneUI = null;

    // Transition interpolation helpers
    this.transitionProgress = 0;
    this.camStartPos = new THREE.Vector3();
    this.camEndPos = new THREE.Vector3();
    this.camStartLook = new THREE.Vector3();
    this.camEndLook = new THREE.Vector3();
    this.camCurrentLook = new THREE.Vector3();

    // Radar Minimap & Compass
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    this.compassTape = document.getElementById('compass-tape');

    this.init();
  }

  init() {
    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25; // Warm, radiant exposure
    this.container.appendChild(this.renderer.domElement);

    // 2. Build 3D Scenes
    this.apartment = new ApartmentScene();
    this.scene.add(this.apartment.group);

    this.rooftop = new RooftopScene();
    this.scene.add(this.rooftop.group);

    // 3. First-Person Game Controls for Rooftop
    this.controls = new GameControls(
      this.camera,
      this.renderer.domElement,
      (hotspot) => this.phoneUI.openHotspotModal(hotspot),
      () => this.startTransitionToApartment()
    );
    this.controls.setHotspots(this.rooftop.hotspots);

    // 4. Smartphone UI Manager & Callbacks
    this.phoneUI = new PhoneUIManager({
      onStart3DExploration: () => this.startTransitionToRooftop(),
      onReturnToPhone: () => this.startTransitionToApartment(),
      onFinishBooking: () => this.advanceToEndingScene(),
      onReplay: () => this.jumpToScene(STATE.SCENE_1_PHONE)
    });

    // 5. Global Navigation & Audio Toggles
    this.setupGlobalControls();

    // 6. Set Initial Camera (Scene 1: Apartment)
    this.setApartmentCamera();

    // Window Resize Handler
    window.addEventListener('resize', () => this.onWindowResize());

    // Universal audio gesture unlock
    const unlockAudio = () => {
      sound.resume();
      const banner = document.getElementById('audio-start-banner');
      if (banner) banner.classList.add('hidden');
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    // Start Animation Loop
    this.animate();
  }

  setApartmentCamera() {
    this.apartment.setVisible(true);
    this.rooftop.setVisible(false);
    this.controls.enabled = false;

    // Cozy medium shot of character on sofa holding phone
    this.camera.position.set(0, 1.45, 1.35);
    this.camCurrentLook.set(0, 1.05, -1.6);
    this.camera.lookAt(this.camCurrentLook);

    document.getElementById('game-hud').classList.remove('active');
  }

  setRooftopCamera() {
    this.apartment.setVisible(false);
    this.rooftop.setVisible(true);
    this.controls.enabled = true;
    this.controls.resetPosition(0, 8, 0); // Facing North toward lit stage

    document.getElementById('game-hud').classList.add('active');
  }

  startTransitionToRooftop() {
    sound.resume();
    this.currentState = STATE.TRANSITION_TO_3D;
    this.transitionProgress = 0;

    this.phoneUI.minimizePhone();

    const flash = document.getElementById('screen-flash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 550);
    }

    this.camStartPos.copy(this.camera.position);
    this.camEndPos.set(0, 1.08, -1.05);
    this.camStartLook.copy(this.camCurrentLook);
    this.camEndLook.set(0, 0.98, -1.25);

    setTimeout(() => {
      this.apartment.setVisible(false);
      this.rooftop.setVisible(true);
      this.controls.enabled = true;
      this.controls.resetPosition(0, 8, 0);
      this.currentState = STATE.SCENE_2_3_ROOFTOP;
      this.updatePills(STATE.SCENE_2_3_ROOFTOP);
      document.getElementById('game-hud').classList.add('active');
    }, 700);
  }

  startTransitionToApartment() {
    sound.playTransitionWhoosh(false);
    this.currentState = STATE.TRANSITION_TO_PHONE;
    this.controls.enabled = false;
    document.getElementById('game-hud').classList.remove('active');

    const flash = document.getElementById('screen-flash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 550);
    }

    setTimeout(() => {
      this.setApartmentCamera();
      this.currentState = STATE.SCENE_4_BOOKING;
      this.phoneUI.showScene4Booking();
      this.updatePills(STATE.SCENE_4_BOOKING);
    }, 650);
  }

  advanceToEndingScene() {
    this.currentState = STATE.SCENE_5_ENDING;
    this.apartment.triggerEndingPose();
    this.phoneUI.showEndingScreen();
    this.updatePills(STATE.SCENE_5_ENDING);
  }

  jumpToScene(targetState) {
    sound.playClick();
    sound.resume();
    this.currentState = targetState;

    if (targetState === STATE.SCENE_1_PHONE) {
      this.setApartmentCamera();
      this.phoneUI.showScene1();
    } else if (targetState === STATE.SCENE_2_3_ROOFTOP) {
      this.phoneUI.minimizePhone();
      this.setRooftopCamera();
    } else if (targetState === STATE.SCENE_4_BOOKING) {
      this.setApartmentCamera();
      this.phoneUI.showScene4Booking();
    } else if (targetState === STATE.SCENE_5_ENDING) {
      this.setApartmentCamera();
      this.advanceToEndingScene();
    }

    this.updatePills(targetState);
  }

  updatePills(activeState) {
    document.querySelectorAll('.scene-step-pill').forEach(pill => {
      if (pill.dataset.scene === activeState) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  setupGlobalControls() {
    // Scene pills
    document.querySelectorAll('.scene-step-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.jumpToScene(pill.dataset.scene);
      });
    });

    // Top Bar Music Button
    const audioBtn = document.getElementById('btn-audio-toggle');
    const updateAudioBtnUI = (isPlaying) => {
      if (!audioBtn) return;
      if (sound.isMuted || !isPlaying) {
        audioBtn.innerHTML = '🔇 <span class="audio-btn-text">Music: Off</span>';
        audioBtn.classList.remove('playing');
      } else {
        audioBtn.innerHTML = '🎵 <span class="audio-btn-text">Music: Playing</span>';
        audioBtn.classList.add('playing');
      }
    };

    sound.onStateChange = (playing) => {
      updateAudioBtnUI(playing);
    };

    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.resume();
        const isMuted = sound.toggleMute();
        updateAudioBtnUI(!isMuted && sound.isPlaying);
      });
    }

    // Audio Start Banner
    const startBanner = document.getElementById('audio-start-banner');
    if (startBanner) {
      startBanner.addEventListener('click', () => {
        sound.resume();
        startBanner.classList.add('hidden');
      });
    }

    // Exit Button
    const exitBtn = document.getElementById('exit-experience-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        this.startTransitionToApartment();
      });
    }

    // Proximity Prompt Click
    const promptElem = document.getElementById('interaction-prompt');
    if (promptElem) {
      promptElem.addEventListener('click', () => {
        if (this.controls && this.controls.nearbyHotspot) {
          this.controls.inspect(this.controls.nearbyHotspot);
        }
      });
    }
  }

  updateMinimapAndCompass() {
    if (!this.minimapCtx || this.currentState !== STATE.SCENE_2_3_ROOFTOP) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 3.6;

    ctx.clearRect(0, 0, w, h);

    // Radar Circles
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Rooftop Deck Rect
    const deckRadius = 16.5 * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(cx - deckRadius, cy - deckRadius, deckRadius * 2, deckRadius * 2);

    // Stage (North)
    ctx.fillStyle = 'rgba(180, 52, 24, 0.6)';
    ctx.fillRect(cx - 15, cy - 11 * scale - 8, 30, 16);

    // Bar (West)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.fillRect(cx - 11 * scale - 6, cy - 18, 12, 36);

    // Hotspot Blips
    this.rooftop.hotspots.forEach(hs => {
      const hx = cx + hs.position.x * scale;
      const hy = cy + hs.position.z * scale;
      ctx.fillStyle = '#b43418';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player Blip & Heading Cone
    const px = cx + this.camera.position.x * scale;
    const py = cy + this.camera.position.z * scale;
    const yaw = this.controls.euler.y;

    // Vision Cone
    ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 22, -yaw - Math.PI / 2 - 0.4, -yaw - Math.PI / 2 + 0.4);
    ctx.closePath();
    ctx.fill();

    // Player Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.compassTape) {
      let deg = Math.round(((-yaw * 180 / Math.PI) % 360 + 360) % 360);
      const shiftX = (deg / 360) * 120;
      this.compassTape.style.transform = `translateX(${-shiftX}px)`;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.apartment.group.visible) {
      this.apartment.update(delta);
    }
    if (this.rooftop.group.visible) {
      this.rooftop.update(delta);
    }

    if (this.currentState === STATE.SCENE_1_PHONE || this.currentState === STATE.SCENE_4_BOOKING) {
      this.camera.position.x = Math.sin(time * 0.4) * 0.08;
      this.camera.position.y = 1.45 + Math.cos(time * 0.3) * 0.04;
      this.camera.lookAt(0, 1.05, -1.6);
    } else if (this.currentState === STATE.TRANSITION_TO_3D) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + delta * 1.4);
      this.camera.position.lerpVectors(this.camStartPos, this.camEndPos, this.transitionProgress);
      this.camCurrentLook.lerpVectors(this.camStartLook, this.camEndLook, this.transitionProgress);
      this.camera.lookAt(this.camCurrentLook);
    } else if (this.currentState === STATE.SCENE_2_3_ROOFTOP) {
      this.controls.update(delta);
      this.updateMinimapAndCompass();
    } else if (this.currentState === STATE.SCENE_5_ENDING) {
      this.camera.position.x = Math.sin(time * 0.25) * 0.4;
      this.camera.position.z = 1.45 + Math.cos(time * 0.25) * 0.2;
      this.camera.lookAt(0, 1.15, -1.65);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.localLoopGame = new LocalLoopGameApp();
});


})(window, document);
