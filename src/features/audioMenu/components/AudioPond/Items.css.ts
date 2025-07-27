// src/components/AudioItem/AudioItem.css.ts
import { globalStyle, style } from "@vanilla-extract/css";

export const audioItem = style({
  position: "relative",
  alignItems: "center",
  justifyContent: "space-between",
  transition: "background-color 0.3s ease-out",
  margin: "16px",
  height: "118px",
  border: "2px solid #4a4a4a",
  backgroundColor: "#282c34",
  color: "white",
  display: "flex", // assumed missing

  selectors: {
    "&:hover": {
      backgroundColor: "#4a4a4a",
    },
  },
});

export const audioLabel = style({
  position: "absolute",
  bottom: "8px",
  right: "8px",
  color: "#ffffff",
});

export const loadingSpinner = style({
  fontSize: "12px",
  color: "#888",
  display: "block",
});

export const errorText = style({
  color: "#c00",
  fontSize: "12px",
});

export const recordedItem = style([
  audioItem,
  {
    position: "relative",
    padding: "16px",
    backgroundColor: "#282c34",
    color: "white",
  },
]);

export const iconButton = style({
  position: "absolute",
  backgroundColor: "transparent",
  border: "none",
  color: "white",
  padding: "4px",
  margin: "auto",
  cursor: "pointer",
  zIndex: 10,
  top: "8px",
  height: "32px",
  width: "32px",
  selectors: {
    "&:focus": {
      outline: "none",
    },
    "&.playing": {
      color: "#eebb00",
    },
  },
});

export const saveButton = style([
  iconButton,
  {
    top: "8px",
    bottom: "auto",
    left: "auto",
    right: "8px",
    backgroundColor: "transparent",
  },
]);

export const selectButton = style([
  iconButton,
  {
    top: "8px",
    left: "8px",
  },
]);

export const playButton = style([
  iconButton,
  {
    top: "auto",
    bottom: "8px",
    left: "6px",
    backgroundColor: "#282c34aa",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
  },
]);

export const deleteButton = style([
  iconButton,
  {
    position: "absolute",
    right: "8px",
    top: "8px",
    backgroundColor: "transparent",
    border: "none",
    color: "white",
    padding: "0",
    cursor: "pointer",
  },
  {
    selectors: {
      "&:hover": {
        backgroundColor: "#c00",
      },
    },
  },
]);

export const playRecorded = style({
  selectors: {
    "&:hover": {
      color: "#eebb00",
    },
  },
});

globalStyle(`${iconButton} .lucide`, {
  strokeWidth: "2px",
  width: "24px",
  height: "24px",
  verticalAlign: "baseline",
});
