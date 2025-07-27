import { blobCountLabel, blobCountRange } from "./BlobCountDropdown.css";

type BlobCountDropDownProps = {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
};

const BlobCountDropDown = ({
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
}: BlobCountDropDownProps) => {
  const options = [];
  for (let i = min; i <= max; i += step) {
    options.push(i);
  }

  return (
    <div className={blobCountLabel}>
      <label>{label} -&nbsp;</label>
      <select
        className={blobCountRange}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BlobCountDropDown;
