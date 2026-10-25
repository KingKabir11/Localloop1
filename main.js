import * as THREE from 'three';
import { sound } from './audio.js';
import { ApartmentScene } from './apartment.js';
import { RooftopScene } from './rooftop.js';
import { GameControls } from './controls.js';
import { PhoneUIManager } from './phone-ui.js';

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
