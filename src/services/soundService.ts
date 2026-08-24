// Web Audio API Sound Generator with High-Clarity Loudness & Acoustic Compression
// Specially calibrated for noisy classroom & lecture hall environments

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          
          // Add dynamic range compressor to boost overall loudness without distortion
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime); // Full high volume

          this.compressor.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Pre-warm audio context on user touch/click to ensure instant loud playback
  public unlockAudio() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Success Chime (✓ KEHADIRAN BERJAYA DIREKOD) - Louder & Clear Classroom Chime
  public playSuccess() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      this.triggerVibrate([80, 40, 100]);
      const now = ctx.currentTime;
      const targetNode = this.compressor || ctx.destination;

      // Note 1: High crisp G5 (784 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);

      gain1.gain.setValueAtTime(0.85, now); // High loudness
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(targetNode);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2: Bright harmonic C6 (1046.5 Hz) - Overlapping for rich chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08);

      gain2.gain.setValueAtTime(0.9, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(targetNode);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);

      // Note 3: High bell E6 (1318.5 Hz) for unmistakable acoustic penetration in noisy rooms
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle'; // Rich overtone for high clarity
      osc3.frequency.setValueAtTime(1318.5, now + 0.15);

      gain3.gain.setValueAtTime(0.95, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc3.connect(gain3);
      gain3.connect(targetNode);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.45);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Duplicate Warning Tone (⚠ SUDAH DIREKOD SEBELUM INI) - Punchy loud double beep
  public playDuplicate() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      this.triggerVibrate([120, 60, 120]);
      const now = ctx.currentTime;
      const targetNode = this.compressor || ctx.destination;

      // Double punchy beep tone (587.33 Hz / D5)
      [0, 0.14].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now + delay);

        gain.gain.setValueAtTime(0.9, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.11);
        osc.connect(gain);
        gain.connect(targetNode);
        osc.start(now + delay);
        osc.stop(now + delay + 0.11);
      });
    } catch {
      // ignore
    }
  }

  // Error Tone (✕ TIADA SESI / QR TIDAK SAH) - Gentle low soft alert (no harsh buzzer)
  public playError() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      this.triggerVibrate([100]);
      const now = ctx.currentTime;
      const targetNode = this.compressor || ctx.destination;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(targetNode);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  // Subtle Click / Action Tone
  public playClick() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const targetNode = this.compressor || ctx.destination;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(targetNode);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }

  // Trigger vibration on supported mobile devices
  public triggerVibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }
}

export const soundService = new SoundService();
