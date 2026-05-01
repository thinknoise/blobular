import { SCALE_DEGREE_SETS, type ScaleName } from "@/shared/constants/scales";
import type {
  ControlsState,
  PartialControlsState,
} from "../types/AudioBlobularPlayer.types";

type UrlSyncedControls = Pick<
  ControlsState,
  "numBlobs" | "duration" | "playbackRate" | "selectedScale"
>;

function parseRangeParam(
  params: URLSearchParams,
  key: string
): [number, number] | undefined {
  const value = params.get(key);
  if (!value) {
    return undefined;
  }

  const [minText, maxText] = value.split("-");
  const min = Number.parseFloat(minText);
  const max = Number.parseFloat(maxText);

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return undefined;
  }

  return [min, max];
}

function parseScaleParam(params: URLSearchParams): ScaleName | undefined {
  const scale = params.get("scale");
  if (!scale) {
    return undefined;
  }

  return (Object.keys(SCALE_DEGREE_SETS) as ScaleName[]).find(
    (name) => name.toLowerCase() === scale.toLowerCase()
  );
}

export function getInitialControlsFromSearch(
  search: string
): PartialControlsState {
  const params = new URLSearchParams(search);
  const rawNumBlobs = params.get("blobs");
  const durationRange = parseRangeParam(params, "duration");
  const playbackRateRange = parseRangeParam(params, "sampleRate");
  const selectedScale = parseScaleParam(params);
  const parsedNumBlobs = rawNumBlobs
    ? Number.parseInt(rawNumBlobs, 10)
    : undefined;
  const numBlobs = Number.isFinite(parsedNumBlobs) ? parsedNumBlobs : undefined;

  return {
    ...(numBlobs !== undefined ? { numBlobs: { value: numBlobs } } : {}),
    ...(durationRange ? { duration: { range: durationRange } } : {}),
    ...(playbackRateRange ? { playbackRate: { range: playbackRateRange } } : {}),
    ...(selectedScale ? { selectedScale } : {}),
  };
}

export function buildControlsUrl(
  pathname: string,
  search: string,
  controls: UrlSyncedControls
): string {
  const params = new URLSearchParams(search);
  params.set("blobs", controls.numBlobs.value.toString());
  params.set(
    "duration",
    `${controls.duration.range[0].toFixed(2)}-${controls.duration.range[1].toFixed(2)}`
  );
  params.set(
    "sampleRate",
    `${controls.playbackRate.range[0].toFixed(2)}-${controls.playbackRate.range[1].toFixed(2)}`
  );
  params.set("scale", controls.selectedScale);
  return `${pathname}?${params.toString()}`;
}

export function getUrlStateSignature(controls: UrlSyncedControls): string {
  return [
    controls.numBlobs.value,
    controls.duration.range[0].toFixed(2),
    controls.duration.range[1].toFixed(2),
    controls.playbackRate.range[0].toFixed(2),
    controls.playbackRate.range[1].toFixed(2),
    controls.selectedScale,
  ].join("|");
}
