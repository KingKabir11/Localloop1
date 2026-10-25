import * as THREE from 'three';
import { sound } from './audio.js';

export class GameControls {
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
