import "vitest";
import "@testing-library/jest-dom";

import { render, screen, fireEvent } from "@testing-library/react";
import ScaleSelect from "./ScaleSelect";
import { ALL_SCALES } from "../../../../shared/constants/scales";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ScaleSelect", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders label and select with current value", () => {
    render(<ScaleSelect value="Major" onChange={mockOnChange} />);
    expect(screen.getByLabelText(/scale/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Major")).toBeInTheDocument();
  });

  it("renders all scale options", () => {
    render(<ScaleSelect value="Minor" onChange={mockOnChange} />);
    ALL_SCALES.forEach(({ name }) => {
      expect(screen.getByRole("option", { name })).toBeInTheDocument();
    });
  });

  it("calls onChange with selected value", () => {
    render(<ScaleSelect value="Minor" onChange={mockOnChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Phrygian" },
    });
    expect(mockOnChange).toHaveBeenCalledWith("Phrygian");
  });
});
