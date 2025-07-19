import * as Slider from "@radix-ui/react-slider";
import "./BlobRangeSlider.css";
import { useEffect } from "react";

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
    // values always [thumb0, thumb1]
    setRange([values[0], values[1]]);
  };

  return (
    <div className="blob-range-slider">
      <span className="slider-value">{range[0].toFixed(2)}</span>
      <Slider.Root
        className="SliderRoot"
        min={min}
        max={max}
        step={step}
        value={range}
        onValueChange={handleChange}
      >
        <Slider.Track className="SliderTrack">
          <Slider.Range className="SliderRange" />
        </Slider.Track>
        {range.map((val, idx) => (
          <Slider.Thumb
            key={idx}
            className="SliderThumb"
            data-value={val.toFixed(2)}
          />
        ))}
      </Slider.Root>
      <span className="slider-value">{range[1].toFixed(2)}</span>
      <label className="slider-label">{label}</label>
    </div>
  );
};

export default BlobRangeSlider;
