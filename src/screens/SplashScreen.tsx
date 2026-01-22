import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LogoMark from "../components/LogoMark";

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate("/onboarding", { replace: true });
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="screen screen--center splash">
      <div className="splash__center">
        <LogoMark size={84} />
        <div className="brand-name">DO IT</div>
      </div>
      <div className="splash__version">v 1.0.0</div>
    </div>
  );
};

export default SplashScreen;
