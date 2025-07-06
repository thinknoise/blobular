// src/components/BlobControls/BlobCountSlider.tsx
import React from "react";
import "./BlobCountSlider.css";

type BlobCountSliderProps = {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
};

const BlobCountSlider = ({
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
}: BlobCountSliderProps) => (
  <div className="blob-count-slider">
    <label className="blob-count-label">
      {label}: {value}
    </label>
    <input
      type="range"
      className="blob-count-range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
    />
  </div>
);

export default BlobCountSlider;
