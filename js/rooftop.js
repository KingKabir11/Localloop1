import * as THREE from 'three';

export class RooftopScene {
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

    // Animated Characters in the Venue
    this.guitarist = null;
    this.bartender = null;
    this.patrons = [];

    this.buildScene();
  }

  buildScene() {
    // 1. Deck Floor & Balustrade (Warm Honey-Teak Wood)
    this.buildDeckAndPerimeter();

    // 2. Bright Golden Hour Sunset Sky & Surrounding Cityscape
    this.buildSunsetSkyline();

    // 3. Zone 1: Live Music Stage (North: z = -11)
    this.buildMusicStage();

    // 4. Zone 2: The Cocktail Bar (West: x = -11)
    this.buildCocktailBar();

    // 5. Zone 3: Dining & Skyline Seating (East/South)
    this.buildSeatingArea();

    // 6. Zone 4: VIP Pergola Lounge
    this.buildPergolaLounge();

    // 7. Overhead Illuminated Festoon String Lights
    this.buildFestoonLights();

    // 8. Atmospheric Floating Golden Light Motes
    this.buildFloatingMotes();

    // 9. Real 3D People & Characters (Musician, Couples, Bartender, Patrons)
    this.buildPeople();

    // 10. Interactive Hotspots (Matching User's AR Screenshot)
    this.createHotspots();

    // 11. Powerful Golden Hour Environmental Lighting
    this.setupGoldenHourLighting();
  }

  setupGoldenHourLighting() {
    const ambientLight = new THREE.AmbientLight(0xffecd2, 1.4);
    this.group.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffa244, 2.5);
    sunLight.position.set(18, 22, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.group.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xfff0db, 0x854d27, 1.3);
    hemiLight.position.set(0, 30, 0);
    this.group.add(hemiLight);

    const centerWarmLight = new THREE.PointLight(0xffb35a, 2.2, 35, 1.2);
    centerWarmLight.position.set(0, 6.5, 0);
    this.group.add(centerWarmLight);
  }

  buildDeckAndPerimeter() {
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x543522,
      roughness: 0.38,
      metalness: 0.15
    });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 34), deckMat);
    deck.position.y = -0.2;
    deck.receiveShadow = true;
    this.group.add(deck);

    const plankMat = new THREE.MeshBasicMaterial({ color: 0x3d2315 });
    for (let i = -16; i <= 16; i += 1.2) {
      const plankLine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 33.8), plankMat);
      plankLine.position.set(i, 0.005, 0);
      this.group.add(plankLine);
    }

    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const createStrip = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), ledMat);
      m.position.set(x, 0.01, z);
      this.group.add(m);
    };
    createStrip(33.6, 0.1, 0, -16.6);
    createStrip(33.6, 0.1, 0, 16.6);
    createStrip(0.1, 33.6, 16.6, 0);
    createStrip(0.1, 33.6, -16.6, 0);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbedbfe,
      transparent: true,
      opacity: 0.3,
      roughness: 0.08,
      metalness: 0.85,
      transmission: 0.8
    });
    const railingPostMat = new THREE.MeshStandardMaterial({ color: 0x2b3040, metalness: 0.9, roughness: 0.2 });

    const createBalustradeSection = (length, isHorizontal, x, z) => {
      const g = new THREE.Group();
      const panelGeo = isHorizontal ? new THREE.BoxGeometry(length, 1.1, 0.04) : new THREE.BoxGeometry(0.04, 1.1, length);
      const glass = new THREE.Mesh(panelGeo, glassMat);
      glass.position.set(x, 0.65, z);
      g.add(glass);

      const railGeo = isHorizontal ? new THREE.BoxGeometry(length, 0.06, 0.08) : new THREE.BoxGeometry(0.08, 0.06, length);
      const rail = new THREE.Mesh(railGeo, railingPostMat);
      rail.position.set(x, 1.22, z);
      g.add(rail);

      const count = Math.floor(length / 3);
      for (let i = 0; i <= count; i++) {
        const offset = -length / 2 + (i / count) * length;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), railingPostMat);
        if (isHorizontal) post.position.set(x + offset, 0.6, z);
        else post.position.set(x, 0.6, z + offset);
        g.add(post);
      }
      this.group.add(g);
    };

    createBalustradeSection(33.6, true, 0, -16.8);
    createBalustradeSection(33.6, true, 0, 16.8);
    createBalustradeSection(33.6, false, 16.8, 0);
    createBalustradeSection(33.6, false, -16.8, 0);
  }

  buildSunsetSkyline() {
    const skylineGroup = new THREE.Group();

    const skyGeo = new THREE.SphereGeometry(220, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skylineGroup.add(skyDome);

    const horizonGeo = new THREE.CylinderGeometry(210, 210, 60, 32, 1, true);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.BackSide, transparent: true, opacity: 0.6 });
    const horizonGlow = new THREE.Mesh(horizonGeo, horizonMat);
    horizonGlow.position.y = 15;
    skylineGroup.add(horizonGlow);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
    sun.position.set(65, 38, -120);
    skylineGroup.add(sun);

    const sunCorona = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 20), new THREE.MeshBasicMaterial({ color: 0xfba24b, transparent: true, opacity: 0.35 }));
    sunCorona.position.set(65, 38, -120);
    skylineGroup.add(sunCorona);

    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.45, metalness: 0.35 });
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
        const winMat = new THREE.PointsMaterial({ color: winColor, size: 0.5, transparent: true, opacity: 0.95 });
        skylineGroup.add(new THREE.Points(winPointsGeo, winMat));
      }

      if (height > 55) {
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 9, 6), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
        antenna.position.set(bx, height - 16 + 4.5, bz);
        skylineGroup.add(antenna);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.set(bx, height - 16 + 9, bz);
        skylineGroup.add(beacon);
      }
    }

    this.group.add(skylineGroup);
  }

  buildMusicStage() {
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 0, -11);

    const stagePlatMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.45, metalness: 0.2 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.65, 5.4), stagePlatMat);
    platform.position.y = 0.325;
    platform.receiveShadow = true;
    stageGroup.add(platform);

    const stepMat = new THREE.MeshStandardMaterial({ color: 0x3b2415, roughness: 0.5 });
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.45), stepMat);
    step1.position.set(0, 0.11, 2.9);
    stageGroup.add(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.44, 0.45), stepMat);
    step2.position.set(0, 0.22, 2.45);
    stageGroup.add(step2);

    const slatWallMat = new THREE.MeshStandardMaterial({ color: 0x613d24, roughness: 0.5 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.4, 0.2), slatWallMat);
    backWall.position.set(0, 2.3, -2.5);
    stageGroup.add(backWall);

    // Illuminated "THE TERRACE SOCIAL" Neon Sign on back wall
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffe8ba });
    const signBar = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 0.08), signMat);
    signBar.position.set(0, 3.3, -2.35);
    stageGroup.add(signBar);

    const signLight = new THREE.PointLight(0xffb84d, 2.2, 10);
    signLight.position.set(0, 3.3, -1.8);
    stageGroup.add(signLight);

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

    // Drumkit behind the singer
    this.buildDrumKit(stageGroup, 1.8, 0.65, -1.2);
    this.buildGuitarAmp(stageGroup, -2.8, 0.65, -1.8);
    this.buildGuitarAmp(stageGroup, 2.8, 0.65, -1.8);
    this.buildMicrophone(stageGroup, -0.1, 0.65, 0.6);

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
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xb43418, metalness: 0.4, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });

    const kick = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.65, 24), shellMat);
    kick.rotation.x = Math.PI / 2;
    kick.position.set(0, 0.58, 0);
    g.add(kick);

    const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 20), shellMat);
    snare.position.set(-0.65, 0.78, 0.25);
    g.add(snare);

    const hihatTop = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.05, 20), brassMat);
    hihatTop.position.set(-1.1, 0.98, 0.2);
    g.add(hihatTop);

    const crash = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.06, 20), brassMat);
    crash.position.set(1.15, 1.35, -0.1);
    g.add(crash);

    parent.add(g);
  }

  buildGuitarAmp(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.45), new THREE.MeshStandardMaterial({ color: 0x1f242e, roughness: 0.7 }));
    cab.position.y = 0.525;
    g.add(cab);

    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.8), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }));
    grill.position.set(0, 0.5, 0.23);
    g.add(grill);
    parent.add(g);
  }

  buildMicrophone(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 16), chromeMat);
    g.add(base);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), chromeMat);
    shaft.position.y = 0.65;
    g.add(shaft);

    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8), chromeMat);
    boom.position.set(0.12, 1.35, 0.15);
    boom.rotation.set(-0.5, 0, 0.4);
    g.add(boom);

    const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), chromeMat);
    capsule.position.set(0.24, 1.52, 0.28);
    g.add(capsule);

    this.audioWaveMesh = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true }));
    this.audioWaveMesh.position.set(0.24, 1.52, 0.28);
    this.audioWaveMesh.rotation.x = Math.PI / 2;
    g.add(this.audioWaveMesh);

    parent.add(g);
  }

  buildCocktailBar() {
    const barGroup = new THREE.Group();
    barGroup.position.set(-11, 0, 0);

    const marbleMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.2, metalness: 0.15 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 10.5), marbleMat);
    counter.position.y = 0.575;
    counter.castShadow = true;
    counter.receiveShadow = true;
    barGroup.add(counter);

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const footrail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10.2, 12), brassMat);
    footrail.position.set(0.78, 0.22, 0);
    footrail.rotation.x = Math.PI / 2;
    barGroup.add(footrail);

    const underLed = new THREE.PointLight(0xffb74d, 2.4, 7);
    underLed.position.set(0.75, 0.85, 0);
    barGroup.add(underLed);

    const backWallMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.6 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 9.8), backWallMat);
    backWall.position.set(-1.8, 1.8, 0);
    barGroup.add(backWall);

    const shelfMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.9, transmission: 0.8 });
    const bottleColors = [0xf59e0b, 0x10b981, 0xef4444, 0x3b82f6, 0xec4899, 0xf97316];

    for (let shelf = 0; shelf < 3; shelf++) {
      const shelfY = 1.0 + shelf * 0.75;
      const glassShelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 9.2), shelfMat);
      glassShelf.position.set(-1.5, shelfY, 0);
      barGroup.add(glassShelf);

      const shelfLight = new THREE.PointLight(0xffd180, 1.2, 5);
      shelfLight.position.set(-1.6, shelfY + 0.15, 0);
      barGroup.add(shelfLight);

      for (let b = 0; b < 14; b++) {
        const bZ = -4.2 + (b / 14) * 8.4;
        const bColor = bottleColors[(shelf * 3 + b) % bottleColors.length];
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 10), new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.15, transparent: true, opacity: 0.9 }));
        bottle.position.set(-1.5, shelfY + 0.16, bZ);
        barGroup.add(bottle);
      }
    }

    const stoolLeatherMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    for (let s = -2; s <= 2; s++) {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(1.4, 0, s * 1.8);

      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), stoolLeatherMat);
      seat.position.y = 0.78;
      stoolGroup.add(seat);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.76, 8), brassMat);
      leg.position.y = 0.38;
      stoolGroup.add(leg);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 16), brassMat);
      base.position.y = 0.02;
      stoolGroup.add(base);

      barGroup.add(stoolGroup);
    }

    this.group.add(barGroup);
  }

  buildSeatingArea() {
    const diningGroup = new THREE.Group();
    const tablePositions = [
      [11, 0, -4],
      [11, 0, 4], // Table 14
      [7, 0, 9],
      [-5, 0, 11]
    ];

    tablePositions.forEach((pos, idx) => {
      this.buildDiningTableSet(diningGroup, pos[0], pos[1], pos[2], idx === 1);
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
    setGroup.add(top);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), metalMat);
    leg.position.y = 0.36;
    setGroup.add(leg);

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

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }));
    lantern.position.set(0, 0.88, 0);
    setGroup.add(lantern);

    const candleLight = new THREE.PointLight(0xffa834, 1.8, 5.5);
    candleLight.position.set(0, 0.92, 0);
    setGroup.add(candleLight);
    this.candleLights.push(candleLight);

    if (isTable14) {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0xb43418 }));
      tag.position.set(0.4, 0.79, 0.4);
      setGroup.add(tag);
    }

    parent.add(setGroup);
  }

  buildPatioHeater(parent, x, y, z) {
    const h = new THREE.Group();
    h.position.set(x, y, z);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.45, 16), metalMat);
    base.position.y = 0.225;
    h.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), metalMat);
    pole.position.y = 1.45;
    h.add(pole);

    const heaterTube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xff5500 }));
    heaterTube.position.y = 2.4;
    h.add(heaterTube);

    const reflector = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.15, 20), metalMat);
    reflector.position.y = 2.65;
    h.add(reflector);

    const heaterLight = new THREE.PointLight(0xff6600, 2.0, 8);
    heaterLight.position.y = 2.4;
    h.add(heaterLight);

    parent.add(h);
  }

  buildPergolaLounge() {
    const g = new THREE.Group();
    g.position.set(7, 0, -8);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x222a38, metalness: 0.7, roughness: 0.3 });

    [[-2.4, 1.6, -2.4], [2.4, 1.6, -2.4], [-2.4, 1.6, 2.4], [2.4, 1.6, 2.4]].forEach(p => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), beamMat);
      post.position.set(...p);
      g.add(post);
    });

    for (let s = -2.2; s <= 2.2; s += 0.5) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 0.08), beamMat);
      slat.position.set(0, 3.25, s);
      g.add(slat);
    }

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x273142, roughness: 0.7 });
    const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 1.0), sofaMat);
    sofaMain.position.set(0, 0.25, -1.6);
    g.add(sofaMain);

    const sofaReturn = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 2.4), sofaMat);
    sofaReturn.position.set(-1.3, 0.25, 0.1);
    g.add(sofaReturn);

    const pergolaLight = new THREE.PointLight(0xffcf70, 2.2, 9);
    pergolaLight.position.set(0, 2.9, 0);
    g.add(pergolaLight);

    this.group.add(g);
  }

  buildFestoonLights() {
    const festoonGroup = new THREE.Group();
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffb74d, emissiveIntensity: 2.2 });

    const spans = [
      [[-16, 4.0, -12], [16, 4.0, -12]],
      [[-16, 4.2, -3], [16, 4.2, -3]],
      [[-16, 4.2, 6], [16, 4.2, 6]],
      [[-16, 4.0, 14], [16, 4.0, 14]]
    ];

    spans.forEach(([start, end]) => {
      const numBulbs = 10;
      for (let b = 0; b <= numBulbs; b++) {
        const t = b / numBulbs;
        const bx = THREE.MathUtils.lerp(start[0], end[0], t);
        const bz = THREE.MathUtils.lerp(start[2], end[2], t);
        const sag = Math.sin(t * Math.PI) * 0.65;
        const by = start[1] - sag;

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bulbMat);
        bulb.position.set(bx, by, bz);
        festoonGroup.add(bulb);
        this.festoonBulbs.push(bulb);

        if (b % 2 === 1) {
          const ptLight = new THREE.PointLight(0xffb84d, 1.4, 7.5);
          ptLight.position.set(bx, by - 0.15, bz);
          festoonGroup.add(ptLight);
        }
      }
    });

    this.group.add(festoonGroup);
  }

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
    this.fireflyParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe082, size: 0.14, transparent: true, opacity: 0.8 }));
    this.group.add(this.fireflyParticles);
  }

  /* ----------------------------------------------------
     REAL 3D CHARACTERS — Stylised Low-Poly Humans
     (Rounded capsule/sphere forms — much better than boxes)
     ---------------------------------------------------- */
  buildPeople() {
    // 1. Acoustic Guitarist seated on stage
    this.buildStagePerformer();

    // 2. Romantic Couple at Table 14 (Skyline View)
    this.buildTableCouple(11, 0, 4);

    // 3. Standing Bartender behind the bar
    this.buildBartender(-11.5, 0, 0);

    // 4. Patron on barstool
    this.buildBarPatron(-9.6, 0, 1.8);

    // 5. Two friends relaxing in the VIP Pergola Lounge
    this.buildLoungePatron(6.2, 0, -9.6, 0x7c3aed, 0xa67046, 0x171717, 0.0);
    this.buildLoungePatron(7.8, 0, -9.6, 0x0891b2, 0xc68642, 0x292524, Math.PI);

    // 6. Extra standing patron near stage watching the music
    this.buildStandingPatron(-3.5, 0, -6.5, 0xea580c, 0x9a6240, 0x1c1917, -0.3);
  }

  /* ---- Low-Poly Character Helpers ---- */

  /**
   * createStylizedHead: SphereGeometry head + hair dome + subtle face features
   */
  createStylizedHead(skinMat, hairMat, { noseBump = true } = {}) {
    const headGroup = new THREE.Group();

    // Main head sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 18), skinMat);
    headGroup.add(head);

    // Hair — slightly larger hemisphere covering top + back
    const hairGeo = new THREE.SphereGeometry(0.152, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.01;
    headGroup.add(hair);

    // Nose bump
    if (noseBump) {
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
      nose.position.set(0, -0.02, 0.14);
      headGroup.add(nose);
    }

    // Ear blobs (left + right)
    const earGeo = new THREE.SphereGeometry(0.036, 8, 8);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.148, 0, 0);
    headGroup.add(earL);
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.148, 0, 0);
    headGroup.add(earR);

    return headGroup;
  }

  /**
   * createRoundedTorso: Uses a CylinderGeometry that is tapered (broader shoulders)
   * giving an organic, clothing-like silhouette.
   */
  createRoundedTorso(mat, { topR = 0.22, bottomR = 0.18, height = 0.54, segs = 14 } = {}) {
    return new THREE.Mesh(new THREE.CylinderGeometry(topR, bottomR, height, segs), mat);
  }

  /**
   * createRoundedLeg: Tapered cylinder for thigh, smaller for shin
   */
  createRoundedLimb(mat, { topR = 0.085, bottomR = 0.065, length = 0.45, segs = 10 } = {}) {
    return new THREE.Mesh(new THREE.CylinderGeometry(topR, bottomR, length, segs), mat);
  }

  /**
   * createRoundedArm: Tapered cylinder for upper arm + forearm
   */
  createRoundedArm(mat, { topR = 0.065, bottomR = 0.048, length = 0.35, segs = 10 } = {}) {
    return new THREE.Mesh(new THREE.CylinderGeometry(topR, bottomR, length, segs), mat);
  }

  /* ---- Full Character Builders ---- */

  buildStagePerformer() {
    const group = new THREE.Group();
    group.position.set(-0.1, 0.65, -11.0);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xa67046, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65 });
    const jeansMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

    // Wooden stool
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 14),
      new THREE.MeshStandardMaterial({ color: 0x3f2413, roughness: 0.6 }));
    stool.position.y = 0.35;
    group.add(stool);

    // Pelvis / hips — rounded cylinder
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.2, 14), jeansMat);
    pelvis.position.y = 0.82;
    group.add(pelvis);

    // Thighs horizontal (seated) — using rotated capsule-like cylinders
    [-0.12, 0.12].forEach(xOff => {
      const thigh = this.createRoundedLimb(jeansMat, { topR: 0.08, bottomR: 0.07, length: 0.42, segs: 12 });
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(xOff, 0.78, 0.2);
      group.add(thigh);

      const shin = this.createRoundedLimb(jeansMat, { topR: 0.065, bottomR: 0.05, length: 0.44, segs: 10 });
      shin.position.set(xOff, 0.44, 0.38);
      group.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.24), shoeMat);
      shoe.position.set(xOff, 0.14, 0.46);
      group.add(shoe);
    });

    // Torso — tapered cylinder (broader at shoulders)
    const torso = this.createRoundedTorso(jacketMat, { topR: 0.22, bottomR: 0.17, height: 0.54 });
    torso.position.y = 1.12;
    group.add(torso);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skinMat);
    neck.position.y = 1.42;
    group.add(neck);

    // Head
    const headGroup = this.createStylizedHead(skinMat, hairMat);
    headGroup.position.set(0, 1.62, 0.02);
    group.add(headGroup);

    // Arms — left holding guitar neck, right strumming
    const leftArm = this.createRoundedArm(jacketMat, { topR: 0.065, bottomR: 0.05, length: 0.32 });
    leftArm.position.set(-0.28, 1.08, 0.22);
    leftArm.rotation.set(0.5, 0, 0.35);
    group.add(leftArm);

    const rightArm = this.createRoundedArm(jacketMat, { topR: 0.065, bottomR: 0.05, length: 0.32 });
    rightArm.position.set(0.26, 1.04, 0.22);
    rightArm.rotation.set(0.6, 0, -0.4);
    group.add(rightArm);

    // Acoustic Guitar
    const guitarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.05 });
    const guitarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.08, 20), guitarMat);
    guitarBody.rotation.x = Math.PI / 2;
    guitarBody.rotation.z = -0.35;
    guitarBody.position.set(0.06, 0.96, 0.32);
    group.add(guitarBody);

    const guitarNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    guitarNeck.rotation.z = 0.55;
    guitarNeck.position.set(-0.2, 1.16, 0.32);
    group.add(guitarNeck);

    this.guitarist = { group, head: headGroup, rightArm, baseRotX: rightArm.rotation.x };
    this.group.add(group);
  }

  buildTableCouple(x, y, z) {
    const coupleGroup = new THREE.Group();
    coupleGroup.position.set(x, y, z);

    // Woman in terracotta dress
    const w = this.createSeatedHuman({
      skinColor: 0x9e6c46, hairColor: 0x171717,
      topColor: 0xb43418, pantColor: 0x262626,
      offsetZ: -1.0, rotY: 0.2
    });
    coupleGroup.add(w.group);
    this.patrons.push(w);

    // Man in navy linen shirt
    const m = this.createSeatedHuman({
      skinColor: 0xb27a4d, hairColor: 0x262626,
      topColor: 0x1e3a8a, pantColor: 0xd4d4d8,
      offsetZ: 1.0, rotY: Math.PI - 0.2
    });
    coupleGroup.add(m.group);
    this.patrons.push(m);

    // Cocktail glasses on table
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.75, transmission: 0.9, roughness: 0.05
    });
    [-0.22, 0.22].forEach((zOff, i) => {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.02, 0.13, 12), glassMat);
      glass.position.set(i === 0 ? 0.22 : -0.22, 0.82, zOff * (i === 0 ? -1 : 1));
      coupleGroup.add(glass);
    });

    this.group.add(coupleGroup);
  }

  buildBartender(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = Math.PI / 2; // Face toward bar customers

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });

    // Legs — two rounded cylinders
    [-0.1, 0.1].forEach(xOff => {
      const thigh = this.createRoundedLimb(apronMat, { topR: 0.08, bottomR: 0.07, length: 0.5, segs: 12 });
      thigh.position.set(xOff, 0.25, 0);
      group.add(thigh);
      const shin = this.createRoundedLimb(apronMat, { topR: 0.068, bottomR: 0.052, length: 0.48, segs: 10 });
      shin.position.set(xOff, -0.24, 0.02);
      group.add(shin);
    });

    // Torso
    const torso = this.createRoundedTorso(shirtMat, { topR: 0.23, bottomR: 0.18, height: 0.56 });
    torso.position.y = 0.82;
    group.add(torso);

    // Apron overlay (plane-like box on front of torso)
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.52, 0.03), apronMat);
    apron.position.set(0, 0.8, 0.17);
    group.add(apron);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skinMat);
    neck.position.y = 1.12;
    group.add(neck);

    // Head
    const headGroup = this.createStylizedHead(skinMat, hairMat);
    headGroup.position.set(0, 1.28, 0);
    group.add(headGroup);

    // Arms
    const leftArm = this.createRoundedArm(shirtMat, { topR: 0.065, bottomR: 0.05, length: 0.34 });
    leftArm.position.set(-0.28, 0.88, 0.1);
    leftArm.rotation.set(-0.4, 0, 0.3);
    group.add(leftArm);

    const rightArm = this.createRoundedArm(shirtMat, { topR: 0.065, bottomR: 0.05, length: 0.34 });
    rightArm.position.set(0.22, 0.88, 0.18);
    rightArm.rotation.set(0.5, 0, -0.25);
    group.add(rightArm);

    // Cocktail shaker in right hand
    const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.24, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 }));
    shaker.position.set(0.28, 0.78, 0.36);
    shaker.rotation.x = 0.5;
    group.add(shaker);

    this.bartender = { group, shaker };
    this.group.add(group);
  }

  buildBarPatron(x, y, z) {
    const patron = this.createSeatedHuman({
      skinColor: 0x9e6c46, hairColor: 0x2d1a10,
      topColor: 0x059669, pantColor: 0x1f2937,
      offsetZ: 0, rotY: Math.PI / 2
    });
    patron.group.position.set(x, y, z);
    this.patrons.push(patron);
    this.group.add(patron.group);
  }

  buildLoungePatron(x, y, z, topColor, skinColor, hairColor, rotY) {
    const patron = this.createSeatedHuman({
      skinColor, hairColor,
      topColor, pantColor: 0x334155,
      offsetZ: 0, rotY
    });
    patron.group.position.set(x, y, z);
    this.patrons.push(patron);
    this.group.add(patron.group);
  }

  buildStandingPatron(x, y, z, topColor, skinColor, hairColor, rotY) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
    const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.7 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.75 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });

    // Feet / shoes
    [-0.1, 0.1].forEach(xOff => {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.24), shoeMat);
      shoe.position.set(xOff, 0.035, 0.02);
      group.add(shoe);
    });

    // Legs
    [-0.1, 0.1].forEach(xOff => {
      const shin = this.createRoundedLimb(pantMat, { topR: 0.068, bottomR: 0.055, length: 0.5, segs: 12 });
      shin.position.set(xOff, 0.28, 0);
      group.add(shin);
      const thigh = this.createRoundedLimb(pantMat, { topR: 0.085, bottomR: 0.072, length: 0.5, segs: 12 });
      thigh.position.set(xOff, 0.77, 0);
      group.add(thigh);
    });

    // Hips
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.18, 14), pantMat);
    hips.position.y = 1.05;
    group.add(hips);

    // Torso
    const torso = this.createRoundedTorso(topMat, { topR: 0.22, bottomR: 0.18, height: 0.56 });
    torso.position.y = 1.38;
    group.add(torso);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skinMat);
    neck.position.y = 1.7;
    group.add(neck);

    // Head
    const headGroup = this.createStylizedHead(skinMat, hairMat);
    headGroup.position.set(0, 1.86, 0);
    group.add(headGroup);

    // Arms by sides, slightly raised (watching stage)
    [-0.28, 0.28].forEach((xOff, i) => {
      const arm = this.createRoundedArm(topMat, { topR: 0.065, bottomR: 0.05, length: 0.38 });
      arm.position.set(xOff, 1.3, 0.06);
      arm.rotation.set(0.15, 0, i === 0 ? 0.18 : -0.18);
      group.add(arm);
    });

    const patron = { group, head: headGroup };
    this.patrons.push(patron);
    this.group.add(group);
  }

  createSeatedHuman({ skinColor, hairColor, topColor, pantColor, offsetZ = 0, rotY = 0 }) {
    const group = new THREE.Group();
    group.position.set(0, 0, offsetZ);
    group.rotation.y = rotY;

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
    const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.65 });
    const pantMat = new THREE.MeshStandardMaterial({ color: pantColor, roughness: 0.72 });

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.32), pantMat);
    pelvis.position.y = 0.48;
    group.add(pelvis);

    // Thighs
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.36), pantMat);
    thigh.position.set(0, 0.46, 0.22);
    group.add(thigh);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.24), topMat);
    torso.position.y = 0.78;
    group.add(torso);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.14, 0.02);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), skinMat);
    headGroup.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.126, 14, 14), hairMat);
    hair.position.set(0, 0.04, -0.01);
    headGroup.add(hair);
    group.add(headGroup);

    return { group, head: headGroup };
  }

  /* ----------------------------------------------------
     Interactive 3D Hotspots (Matching User's AR Screenshot)
     - 🎸 Stage View (Red terracotta pill)
     - 🍸 Cocktail Bar (White pill with red accent)
     - ✨ Skyline Terrace (Amber/gold pill)
     ---------------------------------------------------- */
  createHotspots() {
    const hotspotData = [
      {
        id: 'stage',
        name: 'Stage View',
        position: new THREE.Vector3(0, 1.6, -9.5),
        category: 'Live Acoustic Performance',
        icon: '🎸',
        color: 0xb43418, // Terracotta Red pill
        textColor: '#ffffff',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'Featuring Indie acoustic duo Aarav & Maya. Intimate line-array acoustics tuned for warm vocals and authentic guitar soul.',
        details: [
          { label: 'Set Times', val: '8:00 PM & 10:15 PM' },
          { label: 'Acoustics', val: 'Line-Array Tuned' },
          { label: 'Vibe', val: 'Soulful & Chill' },
          { label: 'Cover Charge', val: '₹499 (100% Redeemable)' }
        ]
      },
      {
        id: 'bar',
        name: 'Cocktail Bar',
        position: new THREE.Vector3(-9.2, 1.6, 0),
        category: 'Artisanal Cocktails',
        icon: '🍸',
        color: 0xffffff, // White pill with red text
        textColor: '#b43418',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'Curated mixology bar featuring smoked single malts, botanical infusions, and zero-proof elixirs by mixologist Rohan.',
        details: [
          { label: 'Signature', val: 'Smoked Rosemary Mezcal' },
          { label: 'Happy Hours', val: 'Till 9:00 PM (1+1)' },
          { label: 'Bar Seating', val: '5 Plush High Stools' },
          { label: 'House Brew', val: 'Included with ticket' }
        ]
      },
      {
        id: 'skyline',
        name: 'Skyline Terrace',
        position: new THREE.Vector3(9.8, 1.6, 4.0),
        category: 'Panoramic Cityscape View',
        icon: '✨',
        color: 0xf59e0b, // Amber Gold pill
        textColor: '#ffffff',
        heroImage: 'assets/images/hero_terrace.png',
        description: 'Unobstructed 180-degree panoramic view of the golden-hour and evening city skyline with candlelit dining tables.',
        details: [
          { label: 'View Angle', val: '180° East Metro' },
          { label: 'Capacity', val: '2 - 4 Guests' },
          { label: 'Status', val: 'Confirmed with Ticket' },
          { label: 'Sunset Vibe', val: 'Golden Hour Peak' }
        ]
      }
    ];

    hotspotData.forEach(data => {
      const pinGroup = new THREE.Group();
      pinGroup.position.copy(data.position);

      // 3D Rounded AR Pill Badge (Matching User's Screenshot!)
      const pillGeo = new THREE.BoxGeometry(1.6, 0.44, 0.08);
      const pillMat = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.25,
        metalness: 0.1
      });
      const pill = new THREE.Mesh(pillGeo, pillMat);
      pinGroup.add(pill);

      // Icon Dot on Left of Pill
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: data.color === 0xffffff ? 0xb43418 : 0xffffff }));
      dot.position.set(-0.55, 0, 0.06);
      pinGroup.add(dot);

      // Glowing Ground Target Ring
      const groundRingMat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      const groundRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.7, 24), groundRingMat);
      groundRing.position.y = -data.position.y + 0.05;
      groundRing.rotation.x = -Math.PI / 2;
      pinGroup.add(groundRing);

      this.group.add(pinGroup);

      data.meshGroup = pinGroup;
      data.groundRing = groundRing;
      this.hotspots.push(data);
    });
  }

  update(delta) {
    const time = this.clock.getElapsedTime();

    // 1. Animate Stage Guitarist
    if (this.guitarist) {
      // Strumming right hand rhythm
      this.guitarist.rightArm.rotation.x = this.guitarist.baseRotX + Math.sin(time * 6.5) * 0.18;
      // Head nodding to the beat
      this.guitarist.head.rotation.x = 0.1 + Math.sin(time * 3.2) * 0.08;
    }

    // 2. Animate Bartender Cocktail Shaker
    if (this.bartender && this.bartender.shaker) {
      this.bartender.shaker.position.y = 1.25 + Math.sin(time * 8.0) * 0.06;
      this.bartender.shaker.rotation.z = Math.sin(time * 8.0) * 0.15;
    }

    // 3. Animate Patrons Chatting / Nodding
    this.patrons.forEach((p, idx) => {
      if (p.head) {
        p.head.rotation.y = Math.sin(time * 1.4 + idx * 2.0) * 0.15;
        p.head.rotation.x = Math.sin(time * 2.0 + idx) * 0.05;
      }
    });

    // 4. Animate Candle Lights
    this.candleLights.forEach((candle, idx) => {
      candle.intensity = 1.6 + Math.sin(time * 7.0 + idx * 3.5) * 0.35;
    });

    // 5. Animate Audio Wave Ring
    if (this.audioWaveMesh) {
      const waveScale = 1.0 + Math.abs(Math.sin(time * 6.0)) * 0.5;
      this.audioWaveMesh.scale.set(waveScale, waveScale, 1);
    }

    // 6. Animate Floating Particles
    if (this.fireflyParticles) {
      const positions = this.fireflyParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time * 1.5 + i) * 0.005;
        positions[i] += Math.cos(time * 1.2 + i) * 0.003;
      }
      this.fireflyParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 7. Billboard Hotspot Badges to face player camera
    this.hotspots.forEach((hs, idx) => {
      if (hs.meshGroup) {
        hs.meshGroup.position.y = hs.position.y + Math.sin(time * 2.5 + idx * 1.5) * 0.08;
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
