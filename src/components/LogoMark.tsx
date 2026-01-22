import React from "react";

type LogoMarkProps = {
  size?: number;
};

const LogoMark: React.FC<LogoMarkProps> = ({ size = 80 }) => {
  return (
    <div className="logo-mark" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
        className="logo-mark__icon"
      >
        <path
          d="M18 33.5L28.5 44l17-18"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default LogoMark;
