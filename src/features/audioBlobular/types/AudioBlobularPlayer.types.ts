import { type ScaleName } from "../../../shared/constants/scales";
export type Range = [number, number];

export type RangeControl = {
  range: Range;
  min: number;
  max: number;
  step: number;
};

export type CountControl = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
};

export type ControlsState = {
  duration: RangeControl;
  fade: RangeControl;
  playbackRate: RangeControl;
  numBlobs: CountControl;
  selectedScale: ScaleName;
};
