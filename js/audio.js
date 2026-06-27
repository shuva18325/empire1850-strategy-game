/* =====================================================================
 * THE OBSERVATION WING — audio engine (Web Audio API)
 *
 * Procedural, no sample files: a low analog hum, a bed of static hiss
 * that swells with facility tension, UI beeps, and an intermittent
 * containment alarm. All of it is purely cosmetic — the game runs fine
 * if Web Audio is unavailable or the player keeps sound muted.
 * ===================================================================== */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = true;        // player-facing master mute (default off)
    this.nodes = {};
    this._alarmOn = false;
  }

  // Must be called from a user gesture.
  init() {
    if (this.ready) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.ctx = ctx;

      // Master
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.9;
      master.connect(ctx.destination);

      // --- Low analog hum (two detuned oscillators) ---
      const humGain = ctx.createGain();
      humGain.gain.value = 0.05;
      humGain.connect(master);
      const o1 = ctx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = 55;
      const o2 = ctx.createOscillator();
      o2.type = 'sine'; o2.frequency.value = 58.7;
      o1.connect(humGain); o2.connect(humGain);
      o1.start(); o2.start();

      // --- 60Hz electrical buzz, very quiet ---
      const buzz = ctx.createOscillator();
      buzz.type = 'sawtooth'; buzz.frequency.value = 60;
      const buzzGain = ctx.createGain();
      buzzGain.gain.value = 0.012;
      buzz.connect(buzzGain); buzzGain.connect(master);
      buzz.start();

      // --- Static hiss bed (looping white noise) ---
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf; noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 2000;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.0;
      noise.connect(noiseFilter); noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();

      this.nodes = { master, humGain, noiseGain };
      this.ready = true;
    } catch (err) {
      console.warn('Audio unavailable:', err);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ready) this._ramp(this.nodes.master.gain, m ? 0 : 0.9, 0.2);
  }

  // In-game audio-gain mechanic also shapes the real hum volume.
  setAudioMode(mode) {
    if (!this.ready) return;
    const g = mode === 'mute' ? 0.0 : mode === 'low' ? 0.05 : 0.13;
    this._ramp(this.nodes.humGain.gain, g, 0.3);
  }

  // Facility tension 0..1 -> static intensity.
  setTension(t) {
    if (!this.ready) return;
    this._ramp(this.nodes.noiseGain.gain, 0.005 + t * 0.12, 0.4);
  }

  beep() {
    if (!this.ready || this.muted) return;
    try {
      const ctx = this.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = 880;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(this.nodes.master);
      o.start(t); o.stop(t + 0.14);
    } catch (e) { /* ignore */ }
  }

  // A short descending "thunk" for failures / breaches.
  thud(freq = 120) {
    if (!this.ready || this.muted) return;
    try {
      const ctx = this.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(this.nodes.master);
      o.start(t); o.stop(t + 0.72);
    } catch (e) { /* ignore */ }
  }

  setAlarm(on) {
    if (!this.ready) return;
    if (on === this._alarmOn) return;
    this._alarmOn = on;
    if (on) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const lfo = ctx.createOscillator();
      lfo.type = 'square'; lfo.frequency.value = 1.6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 120;
      o.frequency.value = 560;
      lfo.connect(lfoGain); lfoGain.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.value = 0.0;
      o.connect(g); g.connect(this.nodes.master);
      o.start(); lfo.start();
      this._ramp(g.gain, 0.05, 0.3);
      this._alarmNodes = { o, lfo, g };
    } else if (this._alarmNodes) {
      const { o, lfo, g } = this._alarmNodes;
      this._ramp(g.gain, 0.0, 0.3);
      setTimeout(() => { try { o.stop(); lfo.stop(); } catch (e) {} }, 400);
      this._alarmNodes = null;
    }
  }

  _ramp(param, value, time) {
    try {
      const t = this.ctx.currentTime;
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(value, t + time);
    } catch (e) { param.value = value; }
  }
}

const AUDIO = new AudioEngine();
