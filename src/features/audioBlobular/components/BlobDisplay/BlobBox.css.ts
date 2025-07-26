// src/components/BlobPanel/BlobBox.css.ts
import { style } from "@vanilla-extract/css";

export const blobBox = style({
  position: "absolute",
  height: "30px",
  backgroundColor: "rgba(255, 133, 133, 0.45)",
  color: "#000000",
  alignContent: "center",
  transition: "background 0.3s",
  fontSize: "small",
  fontWeight: 900,
  zIndex: 99,
  selectors: {
    "&:hover": {
      background: "rgba(255, 255, 255, 0.5)",
    },
  },
});

export const inactive = style({
  opacity: 0.3,
});
