# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SP-1200 is a web-based emulation of the classic E-mu SP-1200 drum machine/sampler. It provides an interactive visual interface with working audio engine that emulates the characteristic 12-bit sound of the original hardware.

## Development Commands

```bash
npm run dev     # Start development server (Next.js)
npm run build   # Production build
npm run lint    # Run ESLint
npm run start   # Start production server
```

## Architecture

### Core Components

- **SP1200.tsx** (`src/components/SP1200.tsx`): Main UI component rendering the full SP-1200 interface. Handles user interactions (pad clicks, slider drags, drag-and-drop sample loading, LED toggling).

- **AudioEngine.ts** (`src/lib/audio/AudioEngine.ts`): Singleton audio engine managing Web Audio API. Handles AudioContext initialization, sample loading/playback, and bitcrusher effect routing.

- **sp1200Store.ts** (`src/store/sp1200Store.ts`): Zustand store bridging UI state with the audio engine. Maps slider values to audio parameters (volume, bit depth, sample rate reduction, wet/dry mix).

- **bitcrusher.js** (`public/worklets/bitcrusher.js`): AudioWorklet processor implementing the 12-bit/26kHz sound character. Parameters: `bitDepth` (1-16), `reduction` (1-32), `mix` (0-1).

### Audio Signal Flow

```
AudioBufferSource → BitcrusherWorklet → MasterGain → AudioContext.destination
```

### State Management

Zustand store syncs UI controls with AudioEngine. Sliders 1-4 map to: Master Volume, Bit Depth, Sample Rate Reduction, and Wet/Dry Mix respectively.

### Key Interactions

- **Sample Loading**: Drag audio files onto pads (requires audio initialization first)
- **Pad Triggering**: Click pads to play loaded samples
- **Sliders**: Draggable for real-time parameter control with 20ms smoothing
- **LEDs**: Toggle on button clicks for visual feedback

## Tech Stack

- Next.js 15 with App Router
- React 19
- TypeScript
- Zustand for state management
- Tailwind CSS for styling
- Web Audio API with AudioWorklet for audio processing
