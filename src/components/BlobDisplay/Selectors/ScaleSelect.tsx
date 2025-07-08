// ScaleSelect.tsx

import { ALL_SCALES, type ScaleName } from "../../../constants/scales";

interface ScaleSelectProps {
  value: ScaleName;
  onChange: (newScale: ScaleName) => void;
}

export default function ScaleSelect({ value, onChange }: ScaleSelectProps) {
  return (
    <label>
      Scale:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ScaleName)}
      >
        {ALL_SCALES.map(({ name }) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
