/**
 * Synthesized sound effects and music (Web Audio API, no audio files).
 * Everything is tuned to A minor pentatonic so effects sit nicely on top of the music.
 * All methods are safe no-ops where Web Audio is missing (tests, old browsers).
 */

export type SoundName =
  | 'eat' | 'golden' | 'bonus' | 'lifeGained' | 'lifeLost' | 'gameOver'
  | 'levelUp' | 'start' | 'countdown' | 'cut' | 'achievement' | 'click';

const mtof = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// A minor pentatonic, A3 to E6
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88];

// Music: Am - F - C - G, one chord per bar
const PROGRESSION = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const BPM = 96;
const STEPS_PER_BAR = 8; // eighth notes

interface ToneOptions {
  freq: number;
  type?: OscillatorType;
  at?: number;        // seconds from now
  dur?: number;
  gain?: number;
  attack?: number;
  glideTo?: number;
  filter?: number;    // lowpass cutoff
  detune?: number;
  reverb?: number;    // 0..1 send
  pan?: number;
  bus?: 'sfx' | 'music';
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverbIn!: GainNode;
  private delayIn!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private musicTimer: number | null = null;
  private nextStepTime = 0;
  private step = 0;

  sfxEnabled = true;
  musicEnabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      try {
        this.build(new AC());
      } catch {
        return null;
      }
    }
    if (this.ctx!.state === 'suspended') this.ctx!.resume().catch(() => {});
    return this.ctx;
  }

  private build(ctx: AudioContext) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(master);

    // Reverb: convolver fed with a decaying stereo noise impulse.
    const len = Math.floor(ctx.sampleRate * 2.4);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    this.reverbIn = ctx.createGain();
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.45;
    this.reverbIn.connect(convolver).connect(reverbOut).connect(master);

    // Dotted-eighth echo for the music arpeggio.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / BPM) * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2200;
    this.delayIn = ctx.createGain();
    this.delayIn.connect(delay);
    delay.connect(delayTone).connect(feedback).connect(delay);
    delayTone.connect(this.musicBus);

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const n = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }

  private tone(o: ToneOptions, toDelay = false) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.at ?? 0);
    const dur = o.dur ?? 0.2;
    const attack = o.attack ?? 0.005;
    const peak = o.gain ?? 0.2;

    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + dur);
    if (o.detune) osc.detune.value = o.detune;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      node = node.connect(f);
    }
    node = node.connect(env);
    if (o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = o.pan;
      node = node.connect(p);
    }
    node.connect(o.bus === 'music' ? this.musicBus : this.sfxBus);
    if (o.reverb) {
      const send = ctx.createGain();
      send.gain.value = o.reverb;
      node.connect(send).connect(this.reverbIn);
    }
    if (toDelay) node.connect(this.delayIn);

    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(at: number, dur: number, gain: number, from: number, to: number, bus: 'sfx' | 'music' = 'sfx', q = 1.2) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + dur * 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(env).connect(bus === 'music' ? this.musicBus : this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Soft two-layer pluck: a triangle body plus a quiet octave "click". */
  private pluck(midi: number, at = 0, gain = 0.22, reverb = 0.25) {
    const f = mtof(midi);
    this.tone({ freq: f, type: 'triangle', at, dur: 0.22, gain, filter: 3200, reverb });
    this.tone({ freq: f * 2, type: 'sine', at, dur: 0.07, gain: gain * 0.35, reverb });
  }

  play(name: SoundName, n = 0) {
    if (!this.sfxEnabled || !this.ensure()) return;
    switch (name) {
      case 'eat':
        // Climbs the scale as apples add up, so streaks sound like a melody.
        this.pluck(PENTA[2 + (n % 9)]);
        break;
      case 'golden':
        [76, 79, 81, 88].forEach((m, i) => {
          this.tone({ freq: mtof(m), at: i * 0.055, dur: 0.5, gain: 0.12, reverb: 0.6, pan: i % 2 ? 0.3 : -0.3 });
          this.tone({ freq: mtof(m + 12), at: i * 0.055, dur: 0.3, gain: 0.04, detune: 6, reverb: 0.6 });
        });
        break;
      case 'bonus':
        [69, 72, 76, 81].forEach((m, i) =>
          this.tone({ freq: mtof(m), type: 'sawtooth', at: i * 0.03, attack: 0.06, dur: 0.9, gain: 0.05, filter: 2400, detune: i * 4 - 6, reverb: 0.5 }));
        this.pluck(84, 0.12, 0.12, 0.5);
        break;
      case 'lifeGained':
        this.tone({ freq: mtof(76), dur: 0.6, gain: 0.16, reverb: 0.55 });
        this.tone({ freq: mtof(81), at: 0.12, dur: 0.8, gain: 0.16, reverb: 0.55 });
        this.tone({ freq: mtof(93), at: 0.12, dur: 0.4, gain: 0.04, reverb: 0.55 });
        break;
      case 'lifeLost':
        this.tone({ freq: 330, type: 'triangle', dur: 0.4, gain: 0.25, glideTo: 90, filter: 1400, reverb: 0.3 });
        this.noise(0, 0.25, 0.15, 900, 120);
        break;
      case 'gameOver':
        [69, 64, 60, 57].forEach((m, i) =>
          this.tone({ freq: mtof(m), type: 'triangle', at: i * 0.17, dur: 0.6, gain: 0.18, filter: 1800, reverb: 0.45 }));
        this.tone({ freq: mtof(45), at: 0.5, dur: 1.2, gain: 0.15, filter: 400, reverb: 0.4 });
        break;
      case 'levelUp':
        [69, 72, 76, 81, 84].forEach((m, i) => this.pluck(m, i * 0.07, 0.18, 0.45));
        [57, 64, 69].forEach(m => this.tone({ freq: mtof(m), type: 'sawtooth', attack: 0.15, at: 0.3, dur: 1.1, gain: 0.04, filter: 1600, reverb: 0.6 }));
        break;
      case 'start':
        this.noise(0, 0.45, 0.12, 300, 4000, 'sfx', 0.8);
        this.tone({ freq: mtof(57), dur: 0.5, gain: 0.12, glideTo: mtof(69), reverb: 0.4 });
        this.pluck(81, 0.35, 0.15, 0.5);
        break;
      case 'countdown':
        this.tone({ freq: n <= 3 ? 1320 : 880, dur: 0.09, gain: 0.1, reverb: 0.2 });
        break;
      case 'cut':
        this.tone({ freq: 700, type: 'triangle', dur: 0.18, gain: 0.15, glideTo: 260, filter: 2000, reverb: 0.25 });
        break;
      case 'achievement':
        [81, 85, 88, 93].forEach((m, i) => {
          this.tone({ freq: mtof(m), at: i * 0.08, dur: 0.7, gain: 0.1, reverb: 0.7, pan: i % 2 ? 0.4 : -0.4 });
          this.tone({ freq: mtof(m) * 3, at: i * 0.08, dur: 0.25, gain: 0.02, reverb: 0.7 });
        });
        break;
      case 'click':
        this.tone({ freq: 1200, dur: 0.04, gain: 0.05 });
        break;
    }
  }

  // ---- Music -------------------------------------------------------------

  private scheduleStep(step: number, at: number) {
    const bar = Math.floor(step / STEPS_PER_BAR) % PROGRESSION.length;
    const s = step % STEPS_PER_BAR;
    const chord = PROGRESSION[bar];
    const beat = 60 / BPM;

    if (s === 0) {
      // Warm pad: two detuned saws per chord note, slow attack.
      chord.forEach(m => [-7, 7].forEach(cents =>
        this.tone({ freq: mtof(m), type: 'sawtooth', at, attack: 0.6, dur: beat * 4, gain: 0.03, filter: 900, detune: cents, reverb: 0.5, bus: 'music' })));
    }
    if (s === 0 || s === 4) {
      // Soft kick and bass on beats 1 and 3.
      this.tone({ freq: 110, at, dur: 0.25, gain: 0.35, glideTo: 42, bus: 'music' });
      this.tone({ freq: mtof(chord[0] - 12), type: 'triangle', at, dur: beat * 1.6, gain: 0.12, filter: 500, bus: 'music' });
    }
    if (s % 2 === 1) {
      // Off-beat hi-hat.
      this.noise(at, 0.05, 0.03, 9000, 7000, 'music', 2);
    }
    // Arpeggio through the echo: up and down the chord, an octave above.
    const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
    const note = chord[pattern[s]] + 12 + (s === 5 ? 12 : 0);
    this.tone({ freq: mtof(note), type: 'triangle', at, dur: 0.18, gain: 0.05, filter: 2600, reverb: 0.3, pan: s % 2 ? 0.25 : -0.25, bus: 'music' }, true);
  }

  startMusic() {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0.55, now + 1.2);
    this.nextStepTime = now + 0.1;
    const stepLen = 60 / BPM / 2;
    // Lookahead scheduler: wake often, schedule notes slightly ahead for sample-accurate timing.
    this.musicTimer = window.setInterval(() => {
      while (this.nextStepTime < ctx.currentTime + 0.15) {
        this.scheduleStep(this.step, this.nextStepTime - ctx.currentTime);
        this.step++;
        this.nextStepTime += stepLen;
      }
    }, 30);
  }

  stopMusic() {
    if (this.musicTimer === null || !this.ctx) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0, now + 0.6);
  }

  setSfx(on: boolean) {
    this.sfxEnabled = on;
  }

  setMusic(on: boolean) {
    this.musicEnabled = on;
    if (!on) this.stopMusic();
  }
}

export const sound = new SoundEngine();
