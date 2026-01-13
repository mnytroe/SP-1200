/**
 * SP-1200 Bitcrusher AudioWorklet Processor
 * Emulates the 12-bit, 26.04kHz sampling of the original E-mu SP-1200
 */
class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'bitDepth',
        defaultValue: 12,
        minValue: 1,
        maxValue: 16,
        automationRate: 'k-rate'
      },
      {
        name: 'reduction',
        defaultValue: 1,
        minValue: 1,
        maxValue: 32,
        automationRate: 'k-rate'
      },
      {
        name: 'mix',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor() {
    super();
    this._lastSample = 0;
    this._sampleCounter = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) {
      return true;
    }

    const bitDepth = parameters.bitDepth[0];
    const reduction = Math.floor(parameters.reduction[0]);
    const mix = parameters.mix[0];

    // Calculate bit reduction values
    const levels = Math.pow(2, bitDepth);
    const step = 2 / levels;

    for (let channel = 0; channel < output.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      if (!inputChannel) continue;

      for (let i = 0; i < outputChannel.length; i++) {
        // Sample rate reduction
        this._sampleCounter++;
        if (this._sampleCounter >= reduction) {
          this._sampleCounter = 0;
          // Bit depth reduction
          // Quantize to discrete levels
          this._lastSample = Math.floor((inputChannel[i] + 1) / step) * step - 1;
          // Clamp to valid range
          this._lastSample = Math.max(-1, Math.min(1, this._lastSample));
        }

        // Mix dry/wet
        outputChannel[i] = inputChannel[i] * (1 - mix) + this._lastSample * mix;
      }
    }

    return true;
  }
}

registerProcessor('bitcrusher-processor', BitcrusherProcessor);
