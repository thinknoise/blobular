// BlobularAudioSource.ts
export class BlobularAudioSource {
  private audioContext: AudioContext;
  private currentBuffer: AudioBuffer | null = null;
  private liveInputNode: MediaStreamAudioSourceNode | null = null;
  private bufferListeners = new Set<() => void>();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async loadFromUrl(url: string) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    this.currentBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  setBuffer(buffer: AudioBuffer | null) {
    this.currentBuffer = buffer;
    this.bufferListeners.forEach((cb) => cb());
  }

  connectLiveInput(stream: MediaStream) {
    this.liveInputNode = this.audioContext.createMediaStreamSource(stream);
  }

  getBuffer(): AudioBuffer | null {
    return this.currentBuffer;
  }

  getLiveInputNode(): MediaStreamAudioSourceNode | null {
    return this.liveInputNode;
  }

  subscribeToBufferChange(cb: () => void) {
    this.bufferListeners.add(cb);
    return () => this.bufferListeners.delete(cb);
  }

  clear() {
    this.currentBuffer = null;
    this.liveInputNode = null;
  }
}
