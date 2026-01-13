import { create } from 'zustand';
import { audioEngine } from '@/lib/audio/AudioEngine';

interface SP1200State {
  // Audio state
  audioInitialized: boolean;
  masterVolume: number;
  bitDepth: number;
  reduction: number;
  mix: number;

  // Pad state
  currentBank: 'A' | 'B' | 'C' | 'D';
  loadedSamples: Record<number, string>; // padIndex -> filename

  // Slider values (0-100)
  sliderValues: number[];

  // Actions
  initAudio: () => Promise<void>;
  setMasterVolume: (value: number) => void;
  setBitDepth: (value: number) => void;
  setReduction: (value: number) => void;
  setMix: (value: number) => void;
  setSliderValue: (index: number, value: number) => void;
  cycleBank: () => void;
  loadSample: (padIndex: number, file: File) => Promise<void>;
  triggerPad: (padIndex: number) => void;
}

export const useSP1200Store = create<SP1200State>((set, get) => ({
  // Initial state
  audioInitialized: false,
  masterVolume: 0.8,
  bitDepth: 12,
  reduction: 1,
  mix: 1,
  currentBank: 'A',
  loadedSamples: {},
  sliderValues: [45, 52, 38, 58, 42, 50, 62, 68], // Initial slider positions (inverted from top%)

  // Actions
  initAudio: async () => {
    try {
      await audioEngine.init();
      set({ audioInitialized: true });

      // Sync initial state to engine
      const state = get();
      audioEngine.setState({
        masterVolume: state.masterVolume,
        bitDepth: state.bitDepth,
        reduction: state.reduction,
        mix: state.mix,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  },

  setMasterVolume: (value: number) => {
    set({ masterVolume: value });
    audioEngine.setState({ masterVolume: value });
  },

  setBitDepth: (value: number) => {
    set({ bitDepth: value });
    audioEngine.setState({ bitDepth: value });
  },

  setReduction: (value: number) => {
    set({ reduction: value });
    audioEngine.setState({ reduction: value });
  },

  setMix: (value: number) => {
    set({ mix: value });
    audioEngine.setState({ mix: value });
  },

  setSliderValue: (index: number, value: number) => {
    const sliderValues = [...get().sliderValues];
    sliderValues[index] = value;
    set({ sliderValues });

    // Map sliders to audio parameters
    // Slider 1: Master Volume (0-100 -> 0-1)
    // Slider 2: Bit Depth (0-100 -> 4-16)
    // Slider 3: Reduction (0-100 -> 1-16)
    // Slider 4: Mix (0-100 -> 0-1)
    switch (index) {
      case 0: // Master Volume
        get().setMasterVolume(value / 100);
        break;
      case 1: // Bit Depth
        get().setBitDepth(4 + (value / 100) * 12);
        break;
      case 2: // Reduction
        get().setReduction(1 + (value / 100) * 15);
        break;
      case 3: // Mix
        get().setMix(value / 100);
        break;
    }
  },

  cycleBank: () => {
    const banks: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const currentIndex = banks.indexOf(get().currentBank);
    const nextIndex = (currentIndex + 1) % banks.length;
    set({ currentBank: banks[nextIndex] });
  },

  loadSample: async (padIndex: number, file: File) => {
    await audioEngine.loadSample(padIndex, file);
    set((state) => ({
      loadedSamples: {
        ...state.loadedSamples,
        [padIndex]: file.name,
      },
    }));
  },

  triggerPad: (padIndex: number) => {
    audioEngine.triggerPad(padIndex);
  },
}));
