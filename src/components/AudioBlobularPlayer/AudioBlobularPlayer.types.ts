import { type ScaleName } from "../../constants/scales";
export type Range = [number, number];

export type RangeControl = {
  range: Range;
  setRange: (range: [number, number]) => void;
  min: number;
  max: number;
  step: number;
};

export type CountControl = {
  value: number;
  min: number;
  max: number;
  step: number;
};

export type ControlsState = {
  duration: RangeControl;
  fade: RangeControl;
  playbackRate: RangeControl;
  numBlobs: CountControl;
  selectedScale: ScaleName;
};
