// ScaleSelect.tsx

import { ALL_SCALES, type ScaleName } from "@/shared/constants/scales";
import "./ScaleSelect.css"; // Ensure you have a CSS file for styling

interface ScaleSelectProps {
  value: ScaleName;
  onChange: (newScale: ScaleName) => void;
}

export default function ScaleSelect({ value, onChange }: ScaleSelectProps) {
  return (
    <label className="scale-select-label">
      Scale -&nbsp;
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
