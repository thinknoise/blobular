// blobRangeSlider.css.ts
import { style } from "@vanilla-extract/css";

export const blobRangeSlider = style({
  display: "flex",
  flexDirection: "row",
  gap: "4px",
  width: "calc(100vw - 58px - 16px)", // Adjusted for padding and controls width
  maxWidth: "100%",
  alignItems: "center",
});

export const sliderLabel = style({
  fontSize: "11px",
  color: "#ffffff",
  padding: "15px 0 15px 18px",
  width: "200px",
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
  transform: "translateY(-50%) translateX(-80%)",
  width: "33px",
  height: "33px",
  borderRadius: "50%",
  backgroundColor: "#3300ff88",
  cursor: "grab",
  selectors: {
    "&:hover": {
      backgroundColor: "#fb2a0055",
    },
    "&:active": {
      backgroundColor: "#fb2a00aa",
    },
    "&::before": {
      content: "attr(data-value)",
      position: "absolute",
      top: "5px",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "13px",
      whiteSpace: "nowrap",
    },
  },
});
