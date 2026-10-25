import * as THREE from 'three';

export class ApartmentScene {
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
