/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlobRangeSlider from "./BlobRangeSlider";
import { describe, expect, it, vi } from "vitest";

describe("BlobRangeSlider", () => {
  const setup = (propsOverrides = {}) => {
    const setRange = vi.fn();
    const props = {
      label: "Test Range",
      range: [10, 90] as [number, number],
      setRange,
      min: 0,
      max: 100,
      step: 1,
      ...propsOverrides,
    };
    render(<BlobRangeSlider {...props} />);
    return { setRange };
  };

  it("renders label and values", () => {
    setup();
    expect(screen.getByText("Test Range")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
  });

  it("renders two thumbs with correct values", () => {
    setup();
    const thumbs = screen.getAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("data-value", "10.00");
    expect(thumbs[1]).toHaveAttribute("data-value", "90.00");
  });

  it("calls setRange when values change", async () => {
    const user = userEvent.setup();
    const { setRange } = setup();

    const thumbs = screen.getAllByRole("slider");
    // set focus on the first thumb before simulating keyboard event
    thumbs[0].focus();
    // simulate keyboard adjustment
    await user.keyboard("[ArrowRight]"); // assuming focus on the first slider
    // NOTE: Real drag events may need to be tested with `@testing-library/user-event@14` + `pointerEventsPolyfill`
    expect(setRange).toHaveBeenCalled();
  });
});
