import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioBufferToWavBlob } from "@/shared/utils/audio/audioBufferToWavBlob";
import "./WaveformViewer.css";

interface WaveformViewerProps {
  buffer?: AudioBuffer;
  audioUrl?: string;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({
  buffer,
  audioUrl,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#333",
      cursorColor: "#555",
      height: 100,
    });
    wavesurferRef.current = wavesurfer;

    // console.log("Initializing WaveSurfer with buffer:", buffer);
    // console.log("Audio URL:", audioUrl);
    if (buffer) {
      wavesurfer.loadBlob(audioBufferToWavBlob(buffer));
    } else if (audioUrl) {
      wavesurfer.load(audioUrl);
    }

    return () => {
      wavesurfer.destroy();
    };
  }, [buffer, audioUrl]);

  return <div ref={containerRef} className="waveform-container" />;
};

export default WaveformViewer;
