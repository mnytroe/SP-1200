/**
 * SP-1200 Audio Engine
 * Handles AudioContext, sample loading, and playback with bitcrusher effect
 */

export interface AudioEngineState {
  masterVolume: number;
  bitDepth: number;
  reduction: number;
  mix: number;
}

type StateSubscriber = (state: AudioEngineState) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bitcrusherNode: AudioWorkletNode | null = null;
  private samples: Map<number, AudioBuffer> = new Map();
  private isInitialized = false;
  private stateSubscribers: StateSubscriber[] = [];

  private state: AudioEngineState = {
    masterVolume: 0.8,
    bitDepth: 12,
    reduction: 1,
    mix: 1,
  };

  /**
   * Initialize AudioContext and load bitcrusher worklet
   * Must be called from a user gesture (click/tap)
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      await this.resume();
      return;
    }

    try {
      // Create AudioContext
      this.ctx = new AudioContext();

      // Load bitcrusher worklet
      await this.ctx.audioWorklet.addModule('/worklets/bitcrusher.js');

      // Create bitcrusher node
      this.bitcrusherNode = new AudioWorkletNode(this.ctx, 'bitcrusher-processor');

      // Create master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.state.masterVolume;

      // Connect: bitcrusher -> masterGain -> destination
      this.bitcrusherNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Apply initial state
      this.applyState();

      this.isInitialized = true;
      console.log('[AudioEngine] Initialized successfully');
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Resume AudioContext if suspended
   */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
      console.log('[AudioEngine] Resumed');
    }
  }

  /**
   * Load a sample from a File (drag & drop)
   */
  async loadSample(padIndex: number, file: File): Promise<void> {
    if (!this.ctx) {
      throw new Error('AudioEngine not initialized');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.samples.set(padIndex, audioBuffer);
      console.log(`[AudioEngine] Sample loaded for pad ${padIndex + 1}: ${file.name}`);
    } catch (error) {
      console.error(`[AudioEngine] Failed to load sample:`, error);
      throw error;
    }
  }

  /**
   * Trigger a pad to play its sample
   */
  triggerPad(padIndex: number): void {
    if (!this.ctx || !this.bitcrusherNode) {
      console.warn('[AudioEngine] Not initialized');
      return;
    }

    const buffer = this.samples.get(padIndex);
    if (!buffer) {
      console.warn(`[AudioEngine] No sample loaded for pad ${padIndex + 1}`);
      return;
    }

    // Create buffer source
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Connect source -> bitcrusher
    source.connect(this.bitcrusherNode);

    // Play immediately
    source.start(0);
    console.log(`[AudioEngine] Triggered pad ${padIndex + 1}`);
  }

  /**
   * Update state and apply to audio nodes with smoothing
   */
  setState(newState: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...newState };
    this.applyState();
    this.notifySubscribers();
  }

  /**
   * Apply current state to audio nodes with smoothing
   */
  private applyState(): void {
    if (!this.ctx || !this.bitcrusherNode || !this.masterGain) return;

    const currentTime = this.ctx.currentTime;
    const smoothTime = 0.02; // 20ms smoothing to avoid zipper noise

    // Master volume with smoothing
    this.masterGain.gain.cancelScheduledValues(currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      this.state.masterVolume,
      currentTime + smoothTime
    );

    // Bitcrusher parameters
    const bitDepthParam = this.bitcrusherNode.parameters.get('bitDepth');
    const reductionParam = this.bitcrusherNode.parameters.get('reduction');
    const mixParam = this.bitcrusherNode.parameters.get('mix');

    if (bitDepthParam) {
      bitDepthParam.cancelScheduledValues(currentTime);
      bitDepthParam.setValueAtTime(bitDepthParam.value, currentTime);
      bitDepthParam.linearRampToValueAtTime(this.state.bitDepth, currentTime + smoothTime);
    }

    if (reductionParam) {
      reductionParam.cancelScheduledValues(currentTime);
      reductionParam.setValueAtTime(reductionParam.value, currentTime);
      reductionParam.linearRampToValueAtTime(this.state.reduction, currentTime + smoothTime);
    }

    if (mixParam) {
      mixParam.cancelScheduledValues(currentTime);
      mixParam.setValueAtTime(mixParam.value, currentTime);
      mixParam.linearRampToValueAtTime(this.state.mix, currentTime + smoothTime);
    }
  }

  /**
   * Get current state
   */
  getState(): AudioEngineState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateSubscriber): () => void {
    this.stateSubscribers.push(callback);
    return () => {
      this.stateSubscribers = this.stateSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(): void {
    this.stateSubscribers.forEach((cb) => cb(this.getState()));
  }

  /**
   * Check if a pad has a sample loaded
   */
  hasSample(padIndex: number): boolean {
    return this.samples.has(padIndex);
  }

  /**
   * Check if engine is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
