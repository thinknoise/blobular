import * as Slider from "@radix-ui/react-slider";
import { useEffect } from "react";
import {
  blobRangeSlider,
  sliderLabel,
  sliderValue,
  sliderRoot,
  sliderTrack,
  sliderRange,
  sliderThumb,
} from "./BlobRangeSlider.css";

type BlobRangeSliderProps = {
  label: string;
  range: [number, number];
  setRange: (val: [number, number]) => void;
  onRangeCommit?: (val: [number, number]) => void; // Called only when user finishes dragging
  min: number;
  max: number;
  step: number;
  showMaxAsRightValue?: boolean; // For duration slider to show total wave length
};

const BlobRangeSlider = ({
  label,
  range,
  setRange,
  onRangeCommit,
  min,
  max,
  step,
  showMaxAsRightValue = false,
}: BlobRangeSliderProps) => {
  useEffect(() => {
    if (range[0] < min) {
      setRange([min, range[1]]);
    }
    if (range[1] > max) {
      setRange([range[0], max]);
    }
  }, [min, max, range, setRange]);

  const handleChange = (values: number[]) => {
    setRange([values[0], values[1]]);
  };

  const handleCommit = (values: number[]) => {
    if (onRangeCommit) {
      onRangeCommit([values[0], values[1]]);
    }
  };

  return (
    <div className={blobRangeSlider}>
      <label className={sliderLabel}>{label}</label>
      <span className={sliderValue}>{min.toFixed(2)}</span>
      <Slider.Root
        key={`${label}-${min}-${max}`}
        className={sliderRoot}
        min={min}
        max={max}
        step={step}
        value={range}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
      >
        <Slider.Track className={sliderTrack}>
          <Slider.Range className={sliderRange} />
        </Slider.Track>
        {range.map((val, idx) => (
          <Slider.Thumb
            key={idx}
            className={sliderThumb}
            data-value={val.toFixed(2)}
          />
        ))}
      </Slider.Root>
      <span className={sliderValue}>
        {showMaxAsRightValue ? max.toFixed(2) : range[1].toFixed(2)}
      </span>
    </div>
  );
};

export default BlobRangeSlider;
