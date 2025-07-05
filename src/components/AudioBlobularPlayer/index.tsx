import { useBlobularEngine } from "./useBlobularEngine";
import BlobDisplay from "../BlobDisplay/BlobDisplay";

const AudioBlobularPlayer = () => {
  const { start, stop, blobEvents } = useBlobularEngine(4); // number of streams

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>

      <BlobDisplay events={blobEvents} />
    </div>
  );
};

export default AudioBlobularPlayer;
