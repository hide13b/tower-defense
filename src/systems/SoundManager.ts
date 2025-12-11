import { Howl, Howler } from 'howler';

export type SoundType =
  | 'shoot_arrow'
  | 'shoot_cannon'
  | 'shoot_slow'
  | 'hit'
  | 'explosion'
  | 'enemy_die'
  | 'enemy_reach'
  | 'tower_place'
  | 'tower_upgrade'
  | 'tower_sell'
  | 'wave_start'
  | 'wave_complete'
  | 'game_over'
  | 'victory';

class SoundManager {
  private sounds: Map<SoundType, Howl> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initializeSounds();
  }

  private initializeSounds(): void {
    // Generate sounds programmatically using Web Audio API through Howler
    // These are simple synthesized sounds

    // Arrow shoot - high pitched short beep
    this.sounds.set(
      'shoot_arrow',
      new Howl({
        src: [this.createToneDataUrl(880, 0.08, 'sine', 0.3)],
        volume: this.volume * 0.5,
      })
    );

    // Cannon shoot - low boom
    this.sounds.set(
      'shoot_cannon',
      new Howl({
        src: [this.createToneDataUrl(150, 0.15, 'square', 0.4)],
        volume: this.volume * 0.7,
      })
    );

    // Slow tower shoot - swoosh
    this.sounds.set(
      'shoot_slow',
      new Howl({
        src: [this.createToneDataUrl(440, 0.12, 'sine', 0.3)],
        volume: this.volume * 0.4,
      })
    );

    // Hit sound
    this.sounds.set(
      'hit',
      new Howl({
        src: [this.createToneDataUrl(300, 0.05, 'square', 0.2)],
        volume: this.volume * 0.3,
      })
    );

    // Explosion - low rumble
    this.sounds.set(
      'explosion',
      new Howl({
        src: [this.createNoiseDataUrl(0.2, 0.5)],
        volume: this.volume * 0.6,
      })
    );

    // Enemy die
    this.sounds.set(
      'enemy_die',
      new Howl({
        src: [this.createToneDataUrl(200, 0.15, 'sawtooth', 0.3, true)],
        volume: this.volume * 0.4,
      })
    );

    // Enemy reach goal
    this.sounds.set(
      'enemy_reach',
      new Howl({
        src: [this.createToneDataUrl(150, 0.3, 'square', 0.5, true)],
        volume: this.volume * 0.6,
      })
    );

    // Tower place
    this.sounds.set(
      'tower_place',
      new Howl({
        src: [this.createToneDataUrl(523, 0.1, 'sine', 0.4)],
        volume: this.volume * 0.5,
      })
    );

    // Tower upgrade - ascending tone
    this.sounds.set(
      'tower_upgrade',
      new Howl({
        src: [this.createChimeDataUrl([523, 659, 784], 0.15)],
        volume: this.volume * 0.5,
      })
    );

    // Tower sell
    this.sounds.set(
      'tower_sell',
      new Howl({
        src: [this.createToneDataUrl(392, 0.15, 'sine', 0.3, true)],
        volume: this.volume * 0.4,
      })
    );

    // Wave start - fanfare
    this.sounds.set(
      'wave_start',
      new Howl({
        src: [this.createChimeDataUrl([392, 523, 659], 0.2)],
        volume: this.volume * 0.6,
      })
    );

    // Wave complete
    this.sounds.set(
      'wave_complete',
      new Howl({
        src: [this.createChimeDataUrl([523, 659, 784, 1047], 0.2)],
        volume: this.volume * 0.6,
      })
    );

    // Game over
    this.sounds.set(
      'game_over',
      new Howl({
        src: [this.createChimeDataUrl([392, 330, 262, 196], 0.3)],
        volume: this.volume * 0.7,
      })
    );

    // Victory
    this.sounds.set(
      'victory',
      new Howl({
        src: [this.createChimeDataUrl([523, 659, 784, 1047, 1319], 0.25)],
        volume: this.volume * 0.7,
      })
    );
  }

  private createToneDataUrl(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    descending: boolean = false
  ): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5) * volume;
      const freq = descending ? frequency * (1 - t / duration * 0.5) : frequency;

      let sample: number;
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * freq * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * ((freq * t) % 1) - 1;
          break;
        case 'triangle':
          sample = 4 * Math.abs(((freq * t) % 1) - 0.5) - 1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * freq * t);
      }

      buffer[i] = sample * envelope;
    }

    return this.bufferToWavDataUrl(buffer, sampleRate);
  }

  private createNoiseDataUrl(duration: number, volume: number): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10) * volume;
      buffer[i] = (Math.random() * 2 - 1) * envelope;
    }

    return this.bufferToWavDataUrl(buffer, sampleRate);
  }

  private createChimeDataUrl(frequencies: number[], noteDuration: number): string {
    const sampleRate = 44100;
    const totalDuration = frequencies.length * noteDuration + 0.1;
    const numSamples = Math.floor(sampleRate * totalDuration);
    const buffer = new Float32Array(numSamples);

    frequencies.forEach((freq, noteIndex) => {
      const noteStart = noteIndex * noteDuration;
      const noteStartSample = Math.floor(noteStart * sampleRate);

      for (let i = 0; i < Math.floor(noteDuration * sampleRate * 2); i++) {
        const sampleIndex = noteStartSample + i;
        if (sampleIndex >= numSamples) break;

        const t = i / sampleRate;
        const envelope = Math.exp(-t * 4) * 0.4;
        const sample = Math.sin(2 * Math.PI * freq * t) * envelope;

        buffer[sampleIndex] += sample;
      }
    });

    // Normalize
    let maxVal = 0;
    for (let i = 0; i < numSamples; i++) {
      maxVal = Math.max(maxVal, Math.abs(buffer[i]));
    }
    if (maxVal > 0) {
      for (let i = 0; i < numSamples; i++) {
        buffer[i] /= maxVal;
      }
    }

    return this.bufferToWavDataUrl(buffer, sampleRate);
  }

  private bufferToWavDataUrl(buffer: Float32Array, sampleRate: number): string {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * bytesPerSample;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  play(type: SoundType): void {
    if (!this.enabled) return;
    const sound = this.sounds.get(type);
    if (sound) {
      sound.play();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      Howler.mute(true);
    } else {
      Howler.mute(false);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
