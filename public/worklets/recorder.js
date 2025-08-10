// Tiny pull-based recorder: sends Float32Array chunks (mono) to main thread
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    const out = new Float32Array(ch.length);
    out.set(ch);
    this.port.postMessage(out, [out.buffer]); // zero-copy
    return true;
  }
}
registerProcessor("recorder", RecorderProcessor);
