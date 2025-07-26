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
  min: number;
  max: number;
  step: number;
};

const BlobRangeSlider = ({
  label,
  range,
  setRange,
  min,
  max,
  step,
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

  return (
    <div className={blobRangeSlider}>
      <label className={sliderLabel}>{label}</label>
      <span className={sliderValue}>{min}</span>
      <Slider.Root
        className={sliderRoot}
        min={min}
        max={max}
        step={step}
        value={range}
        onValueChange={handleChange}
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
      <span className={sliderValue}>{max.toFixed(2)}</span>
    </div>
  );
};

export default BlobRangeSlider;
