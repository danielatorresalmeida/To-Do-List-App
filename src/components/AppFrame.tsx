import React from "react";

type AppFrameProps = {
  children: React.ReactNode;
};

const AppFrame: React.FC<AppFrameProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <div className="phone-frame">
        <div className="frame-content">{children}</div>
      </div>
    </div>
  );
};

export default AppFrame;
