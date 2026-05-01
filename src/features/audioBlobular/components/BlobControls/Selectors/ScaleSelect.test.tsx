import "vitest";
import "@testing-library/jest-dom";

import { render, screen, fireEvent } from "@testing-library/react";
import ScaleSelect from "./ScaleSelect";
import { ALL_SCALES } from "../../../../../shared/constants/scales";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ScaleSelect", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders label and select with current value", () => {
    render(<ScaleSelect value="MajorScale" onChange={mockOnChange} />);
    expect(screen.getByTestId("scale-select")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MajorScale")).toBeInTheDocument();
  });

  it("renders all scale options", () => {
    render(<ScaleSelect value="MinorScale" onChange={mockOnChange} />);
    ALL_SCALES.forEach(({ name }) => {
      expect(screen.getByRole("option", { name })).toBeInTheDocument();
    });
  });

  it("calls onChange with selected value", () => {
    render(<ScaleSelect value="MinorScale" onChange={mockOnChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Blues" },
    });
    expect(mockOnChange).toHaveBeenCalledWith("Blues");
  });
});
