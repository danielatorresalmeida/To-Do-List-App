import React from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import TabBar from "../components/TabBar";

const Calendar: React.FC = () => {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const dates = [
    { label: "26", muted: true },
    { label: "27", muted: true },
    { label: "28", muted: true },
    { label: "29", muted: true },
    { label: "30", muted: true },
    { label: "31", muted: true },
    { label: "1", muted: true },
    { label: "2" },
    { label: "3" },
    { label: "4" },
    { label: "5" },
    { label: "6" },
    { label: "7" },
    { label: "8" },
    { label: "9" },
    { label: "10" },
    { label: "11" },
    { label: "12" },
    { label: "13" },
    { label: "14" },
    { label: "15" },
    { label: "16" },
    { label: "17" },
    { label: "18" },
    { label: "19" },
    { label: "20", active: true },
    { label: "21" },
    { label: "22" },
    { label: "23" },
    { label: "24" },
    { label: "25" },
    { label: "26" },
    { label: "27" },
    { label: "28" },
    { label: "29" },
    { label: "30" },
    { label: "31" },
    { label: "1", muted: true },
    { label: "2", muted: true },
    { label: "3", muted: true },
    { label: "4", muted: true },
    { label: "5", muted: true }
  ];

  return (
    <div className="screen calendar">
      <div className="calendar__header">
        <h2>Manage Your Time</h2>
      </div>

      <div className="calendar-card">
        <div className="calendar-nav">
          <button type="button" className="icon-link" aria-label="Previous month">
            <HiChevronLeft />
          </button>
          <span>January</span>
          <button type="button" className="icon-link" aria-label="Next month">
            <HiChevronRight />
          </button>
        </div>
        <div className="calendar-grid">
          {days.map((day) => (
            <span key={day} className="calendar-day calendar-day--label">
              {day}
            </span>
          ))}
          {dates.map((date, index) => (
            <span
              key={`${date.label}-${index}`}
              className={`calendar-day${date.muted ? " calendar-day--muted" : ""}${
                date.active ? " calendar-day--active" : ""
              }`}
            >
              {date.label}
            </span>
          ))}
        </div>
      </div>

      <div className="calendar-task">
        <h3>Set task for 20 January 2023</h3>
        <div className="calendar-task__row">
          <input type="text" placeholder="Task" />
          <button type="button" className="primary-btn">
            submit
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  );
};

export default Calendar;
