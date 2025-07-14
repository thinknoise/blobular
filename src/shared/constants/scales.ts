// scales.ts

/** 1) Your raw, strongly‐typed tuples */
export const SCALE_DEGREE_SETS = {
  Major: [0, 2, 4, 5, 7, 9, 11] as const,
  Minor: [0, 2, 3, 5, 7, 8, 10] as const,
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const,
  MajorChord: [0, 4, 7] as const,
  MinorChord: [0, 3, 7] as const,
  MinorSeventh: [0, 3, 7, 10] as const,
  Octave: [0, 12] as const,
  Fifths: [0, 7] as const,
  Blues: [0, 3, 5, 6, 7, 10] as const,
  JazzMinor: [0, 2, 3, 5, 7, 9, 10] as const,
  Mixolydian: [0, 2, 4, 5, 7, 9, 10] as const,
  Locrian: [0, 1, 3, 5, 6, 8, 10] as const,
  MelodicMinor: [0, 2, 3, 5, 7, 9, 11] as const,
  Phrygian: [0, 1, 3, 5, 7, 8, 10] as const,
  LydianDominant: [0, 2, 4, 6, 7, 9, 10] as const,
  Algerian: [0, 1, 3, 4, 6, 7, 10] as const,
  JazzHungarianMinor: [0, 1, 4, 5, 7, 8, 10] as const,
  HarmonicMajor: [0, 2, 4, 5, 7, 8, 11] as const,
  HungarianMajor: [0, 2, 4, 5, 7, 8, 10] as const,
  IndianRaga: [0, 1, 3, 4, 5, 6, 8, 9, 10] as const,
  Pentatonic: [0, 2, 4, 7, 9] as const,
  WholeTone: [0, 2, 4, 6, 8, 10] as const,
  Lydian: [0, 2, 4, 6, 7, 9, 11] as const,
  HarmonicMinor: [0, 2, 3, 5, 7, 8, 11] as const,
  HungarianMinor: [0, 2, 3, 6, 7, 8, 11] as const,
  Spanish: [0, 1, 3, 4, 5, 7, 8, 10] as const,
  JazzBlues: [0, 2, 3, 5, 6, 7, 9, 10] as const,
} as const;

/** 2) Derive a union of all the scale names */
export type ScaleName = keyof typeof SCALE_DEGREE_SETS;

/** 3) Build a Record<ScaleName, ReadonlySet<number>> without unsafe casts */
export const SCALE_DEGREE_MAP: Record<ScaleName, ReadonlySet<number>> = (
  Object.keys(SCALE_DEGREE_SETS) as ScaleName[]
).reduce(
  (map, name) => {
    // SCALE_DEGREE_SETS[name] is inferred as readonly number[]
    map[name] = new Set(SCALE_DEGREE_SETS[name]);
    return map;
  },
  {} as Record<ScaleName, ReadonlySet<number>>
);

/** 4) If you also want an array for iteration: */
export const ALL_SCALES: { name: ScaleName; degrees: ReadonlySet<number> }[] = (
  Object.keys(SCALE_DEGREE_MAP) as ScaleName[]
).map((name) => ({
  name,
  degrees: SCALE_DEGREE_MAP[name],
}));

// console.log("SCALE_DEGREE_MAP", SCALE_DEGREE_MAP, ALL_SCALES);
