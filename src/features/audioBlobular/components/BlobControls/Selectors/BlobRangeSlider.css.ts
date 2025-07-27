// blobRangeSlider.css.ts
import { style } from "@vanilla-extract/css";
import { breakpoints } from "@/shared/styles/breakpoints";

export const blobRangeSlider = style({
  display: "flex",
  flexDirection: "row",
  gap: "4px",
  width: "calc(100vw - 58px - 16px)", // Adjusted for padding and controls width
  maxWidth: "100%",
  alignItems: "center",
  height: "80px",

  "@media": {
    [`screen and (max-width: ${breakpoints.md})`]: {
      height: "40px",
    },
  },
});

export const sliderLabel = style({
  fontSize: "11px",
  color: "#ffffff",
  padding: "15px 0 15px 18px",
  textAlign: "left",
});

export const sliderValue = style({
  fontSize: "11px",
  color: "#ffffff",
  margin: "auto 0",
  textAlign: "right",
});

export const sliderRoot = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "0 8px",
});

export const sliderTrack = style({
  backgroundColor: "#6a6a6a",
  position: "relative",
  flexGrow: 1,
  height: "8px",
  borderRadius: "2px",
});

export const sliderRange = style({
  position: "absolute",
  backgroundColor: "#3a80e3",
  height: "100%",
  borderRadius: "2px",
});

export const sliderThumb = style({
  position: "absolute",
  top: "0px",
  transform: "translateY(-50%) translateX(-80%)",
  width: "33px",
  height: "33px",
  borderRadius: "18px",
  backgroundColor: "#3300ff88",
  cursor: "grab",
  transition:
    "top 0.7s ease-out, height 0.7s ease-out, background-color 0.7s ease-out",
  selectors: {
    "&:hover": {
      backgroundColor: "#fb2a0055",
      top: "-5px",
      height: "56px",
      transition:
        "top 0.1s ease-out, height 0.1s ease-out, background-color 0.3s ease-in",
    },
    "&:active, &:focus": {
      backgroundColor: "#fb2a00aa",
      top: "-8px",
      height: "60px",
      boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
      transition:
        "top 0.1s ease-out, height 0.1s ease-out, background-color 0.3s ease-in",
      cursor: "grabbing",
    },
    "&::before": {
      content: "attr(data-value)",
      position: "absolute",
      top: "5px",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "11px",
      whiteSpace: "nowrap",
    },
  },
});
