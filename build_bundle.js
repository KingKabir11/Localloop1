import fs from 'fs';

// Read all files
const audioCode = fs.readFileSync('js/audio.js', 'utf8')
  .replace("import * as THREE from 'three';", '')
  .replace("export const sound = new SoundEngine();", 'const sound = new SoundEngine(); window.sound = sound;');

const controlsCode = fs.readFileSync('js/controls.js', 'utf8')
  .replace("import * as THREE from 'three';", '')
  .replace("import { sound } from './audio.js';", '')
  .replace("export class GameControls", 'class GameControls');

const apartmentCode = fs.readFileSync('js/apartment.js', 'utf8')
  .replace("import * as THREE from 'three';", '')
  .replace("export class ApartmentScene", 'class ApartmentScene');

const rooftopCode = fs.readFileSync('js/rooftop.js', 'utf8')
  .replace("import * as THREE from 'three';", '')
  .replace("export class RooftopScene", 'class RooftopScene');

const phoneUICode = fs.readFileSync('js/phone-ui.js', 'utf8')
  .replace("import { sound } from './audio.js';", '')
  .replace("export class PhoneUIManager", 'class PhoneUIManager');

const mainCode = fs.readFileSync('js/main.js', 'utf8')
  .replace("import * as THREE from 'three';", '')
  .replace("import { sound } from './audio.js';", '')
  .replace("import { ApartmentScene } from './apartment.js';", '')
  .replace("import { RooftopScene } from './rooftop.js';", '')
  .replace("import { GameControls } from './controls.js';", '')
  .replace("import { PhoneUIManager } from './phone-ui.js';", '');

const bundle = `/**
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
  ${audioCode}

  /* --- APARTMENT SCENE --- */
  ${apartmentCode}

  /* --- ROOFTOP SCENE --- */
  ${rooftopCode}

  /* --- GAME CONTROLS --- */
  ${controlsCode}

  /* --- PHONE UI MANAGER --- */
  ${phoneUICode}

  /* --- MAIN GAME APP --- */
  ${mainCode}

})(window, document);
`;

fs.writeFileSync('js/bundle.js', bundle);
console.log('Bundle created successfully! Size:', bundle.length);
