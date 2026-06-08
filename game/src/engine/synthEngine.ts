// 80s-style procedural synth using Web Audio API — no audio files needed

export class SynthEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private playing = false;
  private beatTimer: ReturnType<typeof setTimeout> | null = null;
  private chordIdx = 0;

  // D minor pentatonic — dark, epic, 80s
  // Frequencies for D2, F2, A2, C3, D3 (two octaves)
  private readonly CHORD_SETS = [
    // Dm  (D, F, A)
    { pad: [73.42, 87.31, 110.0], bass: 36.71, arp: [146.83, 174.61, 220.0, 261.63] },
    // Bb  (Bb, D, F)
    { pad: [58.27, 73.42, 87.31], bass: 29.14, arp: [116.54, 146.83, 174.61, 220.0] },
    // F   (F, A, C)
    { pad: [87.31, 110.0, 130.81], bass: 43.65, arp: [174.61, 220.0, 261.63, 293.66] },
    // C   (C, E, G) — slight brightness lift
    { pad: [65.41, 82.41, 98.0], bass: 32.70, arp: [130.81, 164.81, 196.0, 261.63] },
  ];

  private readonly BEAT_MS = 3800; // ~16 beats @ ~100 BPM chord changes

  isPlaying() { return this.playing; }

  start() {
    if (this.playing) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(0, this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.22, this.ctx.currentTime + 1.5);
      this.master.connect(this.ctx.destination);
      this.playing = true;
      this.chordIdx = 0;
      this.scheduleChord();
    } catch (_e) {
      // Web Audio not available
    }
  }

  stop() {
    this.playing = false;
    if (this.beatTimer) { clearTimeout(this.beatTimer); this.beatTimer = null; }
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        try { this.ctx?.close(); } catch (_e) { /* ignore */ }
        this.ctx = null;
        this.master = null;
      }, 900);
    }
  }

  private scheduleChord() {
    if (!this.playing || !this.ctx || !this.master) return;
    const chord = this.CHORD_SETS[this.chordIdx % this.CHORD_SETS.length];
    const now = this.ctx.currentTime;
    const dur = this.BEAT_MS / 1000;

    this.playPad(chord.pad, now, dur);
    this.playBass(chord.bass, now, dur);
    this.playArp(chord.arp, now, dur);

    this.chordIdx++;
    this.beatTimer = setTimeout(() => this.scheduleChord(), this.BEAT_MS - 80);
  }

  private makeReverb(ctx: AudioContext, decay = 1.5): ConvolverNode {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * decay;
    const buffer = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    convolver.buffer = buffer;
    return convolver;
  }

  private playPad(freqs: number[], start: number, dur: number) {
    if (!this.ctx || !this.master) return;
    const reverb = this.makeReverb(this.ctx, 2.0);
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.4;
    reverb.connect(reverbGain);
    reverbGain.connect(this.master);

    freqs.forEach((freq, i) => {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 1.003; // slight detune for thickness
      filter.type = 'lowpass';
      filter.frequency.value = 600 + i * 200;
      filter.Q.value = 1.2;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.4);
      gain.gain.setValueAtTime(0.055, start + dur - 0.6);
      gain.gain.linearRampToValueAtTime(0, start + dur);

      osc1.connect(filter); osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.master!);
      gain.connect(reverb);

      osc1.start(start); osc1.stop(start + dur + 0.1);
      osc2.start(start); osc2.stop(start + dur + 0.1);
    });
  }

  private playBass(freq: number, start: number, dur: number) {
    if (!this.ctx || !this.master) return;
    // Pulsing bass on every beat (4 pulses per chord)
    const pulseInterval = dur / 4;
    for (let beat = 0; beat < 4; beat++) {
      const t = start + beat * pulseInterval;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + pulseInterval * 0.85);

      osc.connect(filter); filter.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + pulseInterval);
    }
  }

  private playArp(freqs: number[], start: number, dur: number) {
    if (!this.ctx || !this.master) return;
    const noteLen = dur / (freqs.length * 2);
    const reverb = this.makeReverb(this.ctx, 0.6);
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.25;
    reverb.connect(reverbGain);
    reverbGain.connect(this.master);

    // Up then down arpeggio
    const pattern = [...freqs, ...freqs.slice().reverse()];
    pattern.forEach((freq, i) => {
      const t = start + i * noteLen;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.value = freq * 2; // two octaves up
      (osc.frequency as AudioParam).setValueAtTime(freq * 2, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteLen * 0.7);

      osc.connect(gain);
      gain.connect(this.master!);
      gain.connect(reverb);
      osc.start(t); osc.stop(t + noteLen);
    });
  }
  // Short satisfying synth "coin" sound on BTC buy
  // Rising arpeggio: D4 → F#4 → A4 → D5, with slight shimmer
  playBuySound(volume: number = 1.0) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    // D major arpeggio (happy, ascending, coin-like)
    const notes = [293.66, 369.99, 440.00, 587.33];
    const noteLen = 0.07;

    notes.forEach((freq, i) => {
      const t = now + i * noteLen;
      // Sine + small square blend for that synth shimmer
      ["sine", "square"].forEach((type, j) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = type as OscillatorType;
        osc.frequency.value = freq;
        filter.type = "bandpass";
        filter.frequency.value = freq * 2;
        filter.Q.value = 2;

        const vol = j === 0 ? 0.18 * volume : 0.06 * volume;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + noteLen * 1.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master!);
        osc.start(t);
        osc.stop(t + noteLen * 2);
      });
    });

    // Final shimmer sparkle on the last note
    const sparkT = now + notes.length * noteLen;
    const sparkOsc = this.ctx.createOscillator();
    const sparkGain = this.ctx.createGain();
    sparkOsc.type = "sine";
    sparkOsc.frequency.setValueAtTime(587.33 * 2, sparkT);
    sparkOsc.frequency.exponentialRampToValueAtTime(587.33 * 3, sparkT + 0.15);
    sparkGain.gain.setValueAtTime(0.12 * volume, sparkT);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, sparkT + 0.25);
    sparkOsc.connect(sparkGain);
    sparkGain.connect(this.master!);
    sparkOsc.start(sparkT);
    sparkOsc.stop(sparkT + 0.3);
  }

}
