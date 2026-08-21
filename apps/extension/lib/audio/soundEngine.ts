import { type OrganismId } from '../personalities/types';

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;
  private muted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMuted(isMuted: boolean) {
    this.muted = isMuted;
  }

  /**
   * Animalese / Character Speech Babble
   * Generates frequency-modulated formant chirps tailored to each character.
   */
  public playAnimalese(text: string, organismId: OrganismId = 'goggins') {
    if (this.muted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    let basePitch = 440;
    let waveType: OscillatorType = 'triangle';

    switch (organismId) {
      case 'waifu':
        basePitch = 680;
        waveType = 'sine';
        break;
      case 'kuro':
        basePitch = 220;
        waveType = 'sawtooth';
        break;
      case 'sherlock':
        basePitch = 380;
        waveType = 'square';
        break;
      case 'goggins':
        basePitch = 260;
        waveType = 'square';
        break;
      case 'sensei':
      default:
        basePitch = 440;
        waveType = 'triangle';
        break;
    }

    const syllables = Math.min(Math.max(3, text.length), 10);
    const syllableDuration = 0.05;
    const startTime = ctx.currentTime + 0.01;

    for (let i = 0; i < syllables; i++) {
      const charCode = text.charCodeAt(i % text.length) || 65;
      const pitchOffset = ((charCode % 11) - 5) * 22;
      const freq = Math.max(120, basePitch + pitchOffset);
      const noteStart = startTime + i * syllableDuration;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, noteStart + syllableDuration * 0.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        organismId === 'goggins' || organismId === 'sherlock' ? 2400 : 1600,
        noteStart
      );

      const targetGain = 0.15 * this.volume;
      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(targetGain, noteStart + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + syllableDuration - 0.004);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + syllableDuration);
    }
  }

  /**
   * Rising Arpeggio Fanfare (Sprint Start or Milestone)
   */
  public playChime(type: 'start' | 'complete' | 'poke') {
    if (this.muted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.01;

    if (type === 'start') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.18 * this.volume, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } else if (type === 'complete') {
      const notes = [392.0, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.1;
        const duration = idx === 3 ? 0.6 : 0.25;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.22 * this.volume, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + duration);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  /**
   * Distraction Alert Sound
   */
  public playAlert() {
    if (this.muted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }
}

export const soundSynth = new SoundSynthesizer();
