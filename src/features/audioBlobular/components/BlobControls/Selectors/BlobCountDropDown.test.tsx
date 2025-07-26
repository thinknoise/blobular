import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import BlobCountDropDown from "./BlobCountDropDown";

describe("BlobCountDropDown", () => {
  const setup = (overrides = {}) => {
    const setValue = vi.fn();
    const props = {
      label: "Blob Count",
      value: 3,
      setValue,
      min: 1,
      max: 5,
      step: 1,
      ...overrides,
    };
    render(<BlobCountDropDown {...props} />);
    return props;
  };

  it("renders the label and current value", () => {
    setup();
    expect(screen.getByText(/Blob Count/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("renders options from min to max", () => {
    setup({ min: 2, max: 4 });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.textContent)).toEqual(["2", "3", "4"]);
  });

  it("calls setValue on change", async () => {
    const user = userEvent.setup();
    const { setValue } = setup();
    const select = screen.getByRole("combobox");

    await user.selectOptions(select, "5");
    expect(setValue).toHaveBeenCalledWith(5);
  });
});
