// src/features/audioBlobular/components/CompactWaveform/CompactWaveform.tsx
import { useRef, useEffect, useState } from "react";
import { getWaveformData } from "@/shared/utils/audio/waveformUtils";
import { useAudioSource } from "../../engine";
import "./CompactWaveform.css";

interface CompactWaveformProps {
  customHeight?: number | null; // Optional height, defaults to 100px
}

const CompactWaveform = ({ customHeight = null }: CompactWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioSource = useAudioSource();
  const [buffer, setBuffer] = useState<AudioBuffer | null>(
    audioSource.getBuffer()
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!buffer || !canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const drawWaveform = () => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.round(width);
      canvas.height = customHeight || Math.round(height);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const waveform = getWaveformData(buffer, canvas.width);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      waveform.forEach((amp, i) => {
        const y = amp * canvas.height;
        ctx.fillRect(i, (canvas.height - y) / 2, 1, y);
      });
    };

    const resizeObserver = new ResizeObserver(drawWaveform);
    resizeObserver.observe(parent);

    drawWaveform();

    return () => resizeObserver.disconnect();
  }, [buffer, customHeight]);

  useEffect(() => {
    const unsubscribe = audioSource.subscribeToBufferChange(() => {
      setBuffer(audioSource.getBuffer());
    });

    return () => {
      unsubscribe(); // ensure this returns void
    };
  }, [audioSource]);

  return (
    <div
      className="compact-waveform-container"
      style={{ height: canvasRef.current?.height }}
    >
      {!buffer && (
        <div className="waveform-loading">
          <div className="loading-spinner"></div>
          <p>Loading audio...</p>
        </div>
      )}
      {buffer && <canvas ref={canvasRef} className="compact-waveform" />}
    </div>
  );
};

export default CompactWaveform;
