import React from "react";

interface MicIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

export const MicIcon: React.FC<MicIconProps> = ({
  size = 32,
  color = "rgba(83, 180, 253)",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{
      verticalAlign: "middle",
      display: "block",
      margin: "auto",
      ...(props.style || {}),
    }}
    aria-label="Start recording"
    {...props}
  >
    <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a1 1 0 1 1 2 0c0 3.53-2.61 6.43-6 6.92V22h3a1 1 0 1 1 0 2h-8a1 1 0 1 1 0-2h3v-2.08C7.61 18.43 5 15.53 5 12a1 1 0 1 1 2 0c0 2.98 2.19 5.44 5 5.93 2.81-.49 5-2.95 5-5.93z" />
  </svg>
);
