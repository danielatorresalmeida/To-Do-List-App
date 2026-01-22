import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineArrowRight
} from "react-icons/hi2";

type Slide = {
  body: string;
  accent: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const slides = useMemo<Slide[]>(
    () => [
      {
        body: "Plan your tasks to do, that way you will stay organized and you won't skip any",
        accent: "#4ee0ff",
        Icon: HiOutlineClipboardDocumentList
      },
      {
        body: "Make a full schedule for the whole week and stay organized and productive all days",
        accent: "#ffd054",
        Icon: HiOutlineCalendarDays
      },
      {
        body: "Create a team task, invite people and manage your work together",
        accent: "#8b7bff",
        Icon: HiOutlineUsers
      },
      {
        body: "Your information is secure with us",
        accent: "#b28bff",
        Icon: HiOutlineShieldCheck
      }
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];
  const isLast = activeIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      navigate("/sign-in");
      return;
    }
    setActiveIndex((prev) => Math.min(prev + 1, slides.length - 1));
  };

  return (
    <div className="screen onboarding">
      <span className="screen-label">service{activeIndex + 1}</span>
      <div className="onboarding__hero" data-animate="rise">
        <div className="illustration" style={{ "--accent": activeSlide.accent } as React.CSSProperties}>
          <div className="illustration__ring" />
          <div className="illustration__glow" />
          <activeSlide.Icon className="illustration__icon" />
        </div>
      </div>
      <p className="onboarding__text" data-animate="rise" style={{ animationDelay: "0.1s" }}>
        {activeSlide.body}
      </p>
      <div className="onboarding__footer" data-animate="rise" style={{ animationDelay: "0.2s" }}>
        <div className="dots" role="tablist" aria-label="Onboarding">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`dot${index === activeIndex ? " dot--active" : ""}`}
              aria-label={`Slide ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
        <button type="button" className="circle-btn" onClick={handleNext} aria-label="Next">
          <HiOutlineArrowRight />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
