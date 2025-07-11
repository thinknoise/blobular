import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformViewerProps {
  audioUrl: string;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#333",
      cursorColor: "#555",
      height: 100,
    });

    wavesurferRef.current.load(audioUrl);

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [audioUrl]);

  return <div ref={containerRef}></div>;
};

export default WaveformViewer;
