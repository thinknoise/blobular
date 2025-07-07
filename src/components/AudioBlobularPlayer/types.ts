export type BlobEvent = {
  blobIndex: number;
  scheduledTime: number;
  duration: number;
  playbackRate: number;
  fadeTime: number;
  pan: {
    start: number; // pan position from -1 (left) to 1 (right)
    rampTo: number; // where to pan at the end of the blob
  };
  timestamp: number;
  offset: number;
};
