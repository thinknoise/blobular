// src/components/BlobControls/BlobControls.css.ts
import { style } from "@vanilla-extract/css";
import { breakpoints } from "@/shared/styles/breakpoints";

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
  marginRight: "8px",
  alignItems: "center",

  "@media": {
    [`screen and (max-width: ${breakpoints.md})`]: {
      flexDirection: "column",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: "12px",
    },
  },
});

export const selectionRow = style({
  display: "flex",
  flexDirection: "row",
  gap: "12px",
  alignItems: "center",
  height: "20px",
  margin: "0 auto 0 auto",

  "@media": {
    [`screen and (max-width: ${breakpoints.md})`]: {
      margin: "0 auto 20px auto",
    },
  },
});
