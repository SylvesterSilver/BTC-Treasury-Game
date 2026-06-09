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

  // 80s ATM sound — mechanical synth "ka-CHING" with descending wobble
  playATMSound(volume: number = 0.9) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;

    // 1. Mechanical "chunk" — filtered noise burst
    const bufLen = this.ctx.sampleRate * 0.08;
    const noiseBuffer = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 3;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3 * volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.master);
    noise.start(now); noise.stop(now + 0.09);

    // 2. 80s synthwave STAB chord — minor for "spending" feel
    const stabNotes = [220, 261.63, 329.63]; // Am chord
    stabNotes.forEach((freq, i) => {
      const t = now + 0.03 + i * 0.02;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1 * volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + 0.25);
    });

    // 3. Descending "money flowing out" sweep
    const sweepT = now + 0.08;
    const sweepOsc = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(880, sweepT);
    sweepOsc.frequency.exponentialRampToValueAtTime(110, sweepT + 0.35);
    sweepGain.gain.setValueAtTime(0.14 * volume, sweepT);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, sweepT + 0.4);
    sweepOsc.connect(sweepGain); sweepGain.connect(this.master!);
    sweepOsc.start(sweepT); sweepOsc.stop(sweepT + 0.45);

    // 4. Punchy bass hit
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(110, now + 0.05);
    bassOsc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    bassGain.gain.setValueAtTime(0.2 * volume, now + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    bassOsc.connect(bassGain); bassGain.connect(this.master!);
    bassOsc.start(now + 0.05); bassOsc.stop(now + 0.3);
  }

  // Sell BTC sound — descending doom synth
  playSellSound(volume: number = 0.8) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;

    // Descending minor arpeggio — feels like dropping value
    const notes = [440, 349.23, 261.63, 196]; // Am descending
    const noteLen = 0.08;
    notes.forEach((freq, i) => {
      const t = now + i * noteLen;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12 * volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteLen * 1.5);
      osc.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + noteLen * 2);
    });

    // Low rumble at the end
    const rumbleT = now + notes.length * noteLen;
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(80, rumbleT);
    rumble.frequency.linearRampToValueAtTime(30, rumbleT + 0.4);
    rumbleGain.gain.setValueAtTime(0.18 * volume, rumbleT);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, rumbleT + 0.5);
    rumble.connect(rumbleGain); rumbleGain.connect(this.master!);
    rumble.start(rumbleT); rumble.stop(rumbleT + 0.55);
  }

  // "There is no second best" — Michael Saylor quote via Web Speech API
  // Fires periodically while game is running (~every 90s)
  speakSaylorQuote() {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) return;

    const phrases = [
      "There is no second best.",
      "Bitcoin is the apex property of the human race.",
      "The best time to buy Bitcoin is now.",
      "Stack sats. Stay humble.",
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 0.88;
    utterance.pitch = 0.85;
    utterance.volume = 0.55;

    // Try to find a deep male voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('david') ||
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('alex')
    );
    if (preferred) utterance.voice = preferred;

    // Add a short reverb effect by scheduling two slightly delayed utterances
    window.speechSynthesis.speak(utterance);
  }

  // Emergency alarm — aggressive klaxon
  playAlarmSound() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const BEEP = 0.11;
    const PAUSE = 0.04;
    for (let i = 0; i < 8; i++) {
      const t = now + i * (BEEP + PAUSE);
      const freq = i % 2 === 0 ? 880 : 1320;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.008);
      gain.gain.setValueAtTime(0.20, t + BEEP - 0.015);
      gain.gain.linearRampToValueAtTime(0, t + BEEP);
      osc.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + BEEP + 0.02);
      // Bass thud
      const bass = this.ctx!.createOscillator();
      const bassG = this.ctx!.createGain();
      bass.type = 'sine';
      bass.frequency.value = freq / 2;
      bassG.gain.setValueAtTime(0.08, t);
      bassG.gain.exponentialRampToValueAtTime(0.001, t + BEEP);
      bass.connect(bassG); bassG.connect(this.master!);
      bass.start(t); bass.stop(t + BEEP + 0.02);
    }
  }

}
