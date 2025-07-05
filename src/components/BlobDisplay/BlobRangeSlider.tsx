import * as Slider from "@radix-ui/react-slider";
import "./BlobRangeSlider.css";

type BlobRangeSliderProps = {
  label: string;
  range: [number, number];
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>;
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
  const handleChange = (values: number[]) => {
    setRange([values[0], values[1]]);
  };

  return (
    <div className="blob-range-slider">
      <label>
        {label}: {range[0].toFixed(2)} – {range[1].toFixed(2)}
      </label>
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
        <Slider.Thumb className="SliderThumb" />
        <Slider.Thumb className="SliderThumb" />
      </Slider.Root>
    </div>
  );
};

export default BlobRangeSlider;
