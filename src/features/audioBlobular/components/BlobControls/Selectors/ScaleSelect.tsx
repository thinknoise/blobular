// ScaleSelect.tsx

import { ALL_SCALES, type ScaleName } from "@/shared/constants/scales";
import { scaleSelectLabel } from "./ScaleSelect.css";

interface ScaleSelectProps {
  value: ScaleName;
  onChange: (newScale: ScaleName) => void;
}

export default function ScaleSelect({ value, onChange }: ScaleSelectProps) {
  return (
    <div className={scaleSelectLabel}>
      <label>Scale -&nbsp; </label>
      <select
        data-testid="scale-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ScaleName)}
      >
        {ALL_SCALES.map(({ name }) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
