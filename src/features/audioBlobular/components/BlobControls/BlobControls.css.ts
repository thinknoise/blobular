// src/components/BlobControls/BlobControls.css.ts
import { style } from "@vanilla-extract/css";

export const blobControls = style({
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between", // push rows apart
  gap: "12px", // optional if space-between handles spacing
  padding: "0 0 0 58px",
  width: "calc(100% - 58px)", // Adjusted for padding
  height: "100%", // required to allow vertical spacing
});

export const controlRow = style({
  display: "flex",
  flexDirection: "row",
  gap: "8px",
  marginRight: "8px", // Adjusted for right margin
});
