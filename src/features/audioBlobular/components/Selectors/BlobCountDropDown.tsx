import "./BlobCountDropdown.css"; // optionally rename this too

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
    <div className="blob-range-dropdown">
      <label className="blob-count-label">{label}:&nbsp;</label>
      <select
        className="blob-count-dropdown"
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
