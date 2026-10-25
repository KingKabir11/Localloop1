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

export const sound = new SoundEngine();
