// src/components/BlobControls/BlobCountDropdown.css.ts
import { style } from "@vanilla-extract/css";

export const blobCountSlider = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

export const blobCountLabel = style({
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
});

export const blobCountRange = style({
  flexGrow: 1,
  cursor: "pointer",
});
