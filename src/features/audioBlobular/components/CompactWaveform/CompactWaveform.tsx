// src/components/CompactWaveform.tsx
import { useRef, useEffect } from "react";
import type { FC } from "react";
import { getWaveformData } from "@/shared/utils/audio/waveformUtils";
import "./CompactWaveform.css";

interface CompactWaveformProps {
  /** The decoded AudioBuffer to visualize */
  buffer: AudioBuffer;
  customHeight?: number; // Optional height, defaults to 100px
}

const CompactWaveform: FC<CompactWaveformProps> = ({
  buffer,
  customHeight = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // Use ResizeObserver to handle container resizes
    const resizeObserver = new ResizeObserver(drawWaveform);
    resizeObserver.observe(parent);

    // Initial draw
    drawWaveform();

    return () => resizeObserver.disconnect();
  }, [buffer, customHeight]);

  return (
    <div
      className="compact-waveform-container"
      style={{ height: canvasRef.current?.height }}
    >
      <canvas ref={canvasRef} className="compact-waveform" />
    </div>
  );
};

export default CompactWaveform;
