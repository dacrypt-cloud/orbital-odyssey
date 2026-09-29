/**
 * Orbital Odyssey: Gravity Well
 * Procedural Web Audio API Sound Engine (Zero external paid/network assets required)
 */
(function (root) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.initialized = false;
      this.thrusterNode = null;
      this.thrusterGain = null;
      this.thrusterFilter = null;
      this.noiseBuffer = null;

      try {
        const savedMute = localStorage.getItem('orbital_odyssey_muted');
        if (savedMute !== null) {
          this.muted = savedMute === 'true';
        }
      } catch (e) {
        // Ignore storage errors in restricted contexts
      }
    }

    init() {
      if (this.initialized && this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.initialized = true;
        this._createNoiseBuffer();
        this._setupThrusterLoop();
      } catch (e) {
        this.initialized = false;
      }
    }

    _createNoiseBuffer() {
      if (!this.ctx) return;
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    _setupThrusterLoop() {
      if (!this.ctx || !this.noiseBuffer) return;
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 140;
        filter.Q.value = 1.8;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.0001;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);

        this.thrusterNode = source;
        this.thrusterFilter = filter;
        this.thrusterGain = gain;
      } catch (e) {
        // Ignore thruster loop failures
      }
    }

    setMuted(muted) {
      this.muted = !!muted;
      try {
        localStorage.setItem('orbital_odyssey_muted', String(this.muted));
      } catch (e) {}
      if (this.muted && this.thrusterGain && this.ctx) {
        this.thrusterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
      }
      return this.muted;
    }

    toggleMute() {
      return this.setMuted(!this.muted);
    }

    updateThruster(isThrusting, isBoosting) {
      if (!this.initialized || !this.ctx || !this.thrusterGain || !this.thrusterFilter) return;
      const now = this.ctx.currentTime;
      if (this.muted || (!isThrusting && !isBoosting)) {
        this.thrusterGain.gain.setTargetAtTime(0.0001, now, 0.05);
        return;
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const targetGain = isBoosting ? 0.14 : 0.065;
      const targetFreq = isBoosting ? 260 : 145;
      this.thrusterGain.gain.setTargetAtTime(targetGain, now, 0.04);
      this.thrusterFilter.frequency.setTargetAtTime(targetFreq, now, 0.04);
    }

    playClick() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.055);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.065);
      } catch (e) {}
    }

    playCollect(combo = 1) {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const baseFreq = 523.25 * Math.pow(1.06, Math.min(combo - 1, 12)); // C5 scaling up
        const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = idx === 2 ? 'triangle' : 'sine';
          const start = now + idx * 0.04;
          osc.frequency.setValueAtTime(freq, start);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.04, start + 0.14);
          gain.gain.setValueAtTime(0.09, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + 0.17);
        });
      } catch (e) {}
    }

    playPowerup() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const freqs = [392, 523.25, 659.25, 783.99];
        freqs.forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const t = now + i * 0.045;
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.09, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.19);
        });
      } catch (e) {}
    }

    playPortalUnlock() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
        chord.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          const t = now + idx * 0.05;
          osc.frequency.setValueAtTime(freq * 0.98, t);
          osc.frequency.exponentialRampToValueAtTime(freq, t + 0.45);
          gain.gain.setValueAtTime(0.07, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.58);
        });
      } catch (e) {}
    }

    playSlingshot() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(860, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.34);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } catch (e) {}
    }

    playDamage() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        // Low thump
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        // Noise burst
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(900, now);
          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.12, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + 0.19);
        }
      } catch (e) {}
    }

    playExplosion() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(24, now + 0.55);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);

        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.frequency.exponentialRampToValueAtTime(140, now + 0.5);
          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.18, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + 0.54);
        }
      } catch (e) {}
    }

    playLevelComplete() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        this.updateThruster(false, false);
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const start = now + i * 0.09;
          const dur = i === notes.length - 1 ? 0.55 : 0.22;
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.12, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + dur + 0.02);
        });
      } catch (e) {}
    }

    playGameOver() {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        this.updateThruster(false, false);
        const now = this.ctx.currentTime;
        const notes = [392.0, 349.23, 311.13, 261.63];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          const start = now + i * 0.14;
          const dur = i === notes.length - 1 ? 0.6 : 0.24;
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.08, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + dur + 0.02);
        });
      } catch (e) {}
    }
  }

  root.Orbital = root.Orbital || {};
  root.Orbital.SoundEngine = SoundEngine;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundEngine };
  }
})(typeof window !== 'undefined' ? window : globalThis);
