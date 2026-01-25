import React, { useEffect, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import TabBar from "../components/TabBar";
import {
  createCalendarEvent,
  getCalendarAuthUrl,
  getCalendarStatus,
  listCalendarEvents,
  type GoogleCalendarEvent
} from "../services/googleCalendar";
import { addTask, createTask, formatDate, loadTasks } from "../services/tasks";
import { buildCalendarEventPayload } from "../services/taskSync";

const Calendar: React.FC = () => {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(() => formatDate(today));
  const [taskTime, setTaskTime] = useState("09:00");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await getCalendarStatus();
        setCalendarConnected(result.connected);
      } catch {
        setCalendarConnected(false);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (!calendarConnected) {
      setEvents([]);
      return;
    }
    const loadEvents = async () => {
      setIsSyncing(true);
      try {
        const upcoming = await listCalendarEvents({ maxResults: 6 });
        setEvents(upcoming);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load calendar events.";
        setStatus({ tone: "error", message });
      } finally {
        setIsSyncing(false);
      }
    };
    loadEvents();
  }, [calendarConnected]);

  const handleConnect = async () => {
    setStatus(null);
    setIsConnecting(true);
    try {
      const authUrl = await getCalendarAuthUrl();
      const popup = window.open(authUrl, "google-calendar", "width=500,height=600");
      if (!popup) {
        throw new Error("Popup blocked. Please allow popups to connect Google Calendar.");
      }
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type !== "google-calendar-connected") {
          return;
        }
        try {
          const result = await getCalendarStatus();
          setCalendarConnected(result.connected);
          setStatus({ tone: "success", message: "Google Calendar connected successfully." });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to confirm connection.";
          setStatus({ tone: "error", message });
        } finally {
          setIsConnecting(false);
        }
      };
      window.addEventListener("message", handleMessage, { once: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect Google Calendar.";
      setStatus({ tone: "error", message });
      setIsConnecting(false);
    } finally {
      setTimeout(async () => {
        try {
          const result = await getCalendarStatus();
          if (result.connected) {
            setCalendarConnected(true);
          }
        } catch {
          // ignore
        }
      }, 2000);
      setTimeout(() => setIsConnecting(false), 12000);
    }
  };

  const refreshEvents = async (options?: { silent?: boolean }) => {
    if (!calendarConnected) {
      return;
    }
    setIsSyncing(true);
    if (!options?.silent) {
      setStatus(null);
    }
    try {
      const upcoming = await listCalendarEvents({ maxResults: 6 });
      setEvents(upcoming);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh calendar events.";
      setStatus({ tone: "error", message });
    } finally {
      setIsSyncing(false);
    }
  };

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const getMonthLabel = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const clampDay = (date: Date, day: number) => {
    const max = getDaysInMonth(date);
    return Math.min(day, max);
  };

  const changeMonth = (delta: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    const nextSelected = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      clampDay(nextMonth, selectedDate.getDate())
    );
    setCurrentMonth(nextMonth);
    setSelectedDate(nextSelected);
    setTaskDate(formatDate(nextSelected));
  };

  const buildCalendarGrid = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const muted = date.getMonth() !== currentMonth.getMonth();
      return {
        date,
        label: date.getDate(),
        muted,
        active: isSameDay(date, selectedDate),
        today: isSameDay(date, today)
      };
    });
  };

  const calendarDates = buildCalendarGrid();

  const handleCreateEvent = async () => {
    if (!calendarConnected) {
      setStatus({ tone: "error", message: "Connect Google Calendar before adding events." });
      return;
    }
    if (!taskTitle.trim()) {
      setStatus({ tone: "error", message: "Add a task title to create a calendar event." });
      return;
    }
    if (!taskDate || !taskTime) {
      setStatus({ tone: "error", message: "Pick a date and time for the event." });
      return;
    }

    setIsCreating(true);
    setStatus(null);
    try {
      const newTask = createTask(
        {
          title: taskTitle.trim(),
          description: "",
          dueDate: taskDate,
          dueTime: taskTime
        },
        {
          syncSource: "local"
        }
      );
      const eventInput = buildCalendarEventPayload(newTask);
      const created = await createCalendarEvent(eventInput);
      const syncedTask = { ...newTask, googleEventId: created.id };
      addTask(loadTasks(), syncedTask);
      setTaskTitle("");
      await refreshEvents({ silent: true });
      setStatus({ tone: "success", message: "Event added to Google Calendar." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create calendar event.";
      setStatus({ tone: "error", message });
    } finally {
      setIsCreating(false);
    }
  };

  const formatEventTime = (event: GoogleCalendarEvent) => {
    if (event.start?.dateTime) {
      const date = new Date(event.start.dateTime);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    }

    if (event.start?.date) {
      const date = new Date(`${event.start.date}T00:00:00`);
      const label = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
      return `${label} (all day)`;
    }

    return "Time TBD";
  };

  return (
    <div className="screen calendar">
      <div className="calendar__header">
        <h2>Manage Your Time</h2>
      </div>

      <div className="calendar-card">
        <div className="calendar-nav">
          <button type="button" className="icon-link" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <HiChevronLeft />
          </button>
          <span>{getMonthLabel(currentMonth)}</span>
          <button type="button" className="icon-link" aria-label="Next month" onClick={() => changeMonth(1)}>
            <HiChevronRight />
          </button>
        </div>
        <div className="calendar-grid">
          {days.map((day) => (
            <span key={day} className="calendar-day calendar-day--label">
              {day}
            </span>
          ))}
          {calendarDates.map((date) => (
            <button
              key={date.date.toISOString()}
              type="button"
              className={`calendar-day${date.muted ? " calendar-day--muted" : ""}${
                date.active ? " calendar-day--active" : ""
              }${date.today ? " calendar-day--today" : ""}`}
              onClick={() => {
                setSelectedDate(date.date);
                setTaskDate(formatDate(date.date));
                if (date.muted) {
                  setCurrentMonth(new Date(date.date.getFullYear(), date.date.getMonth(), 1));
                }
              }}
              aria-pressed={date.active}
            >
              {date.label}
            </button>
          ))}
        </div>
      </div>

      <div className="calendar-sync">
        <div className="calendar-sync__header">
          <h3>Google Calendar</h3>
          <span
            className={`status-pill ${calendarConnected ? "status-pill--success" : "status-pill--error"}`}
            aria-live="polite"
          >
            {calendarConnected ? "Connected" : "Not connected"}
          </span>
        </div>
        <p className="calendar-sync__note">Link your Google Calendar to see upcoming events and add tasks.</p>
        <div className="calendar-sync__actions">
          <button type="button" className="primary-btn" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : calendarConnected ? "Reconnect" : "Connect"}
          </button>
          {calendarConnected ? (
            <button type="button" className="ghost-btn" onClick={refreshEvents} disabled={isSyncing}>
              {isSyncing ? "Refreshing..." : "Refresh"}
            </button>
          ) : null}
        </div>
        {status ? (
          <div className={`status-pill ${status.tone === "success" ? "status-pill--success" : "status-pill--error"}`}>
            {status.message}
          </div>
        ) : null}
        {calendarConnected ? (
          <div className="calendar-events">
            <h4>Upcoming events</h4>
            {events.length ? (
              <div className="calendar-events__list">
                {events.map((event) => (
                  <div key={event.id} className="calendar-event">
                    <div>
                      <p className="calendar-event__title">{event.summary || "Untitled event"}</p>
                      <p className="calendar-event__time">{formatEventTime(event)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="calendar-empty">No upcoming events found.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="calendar-task">
        <h3>Add event to Google Calendar</h3>
        <div className="calendar-task__row">
          <input
            type="text"
            placeholder="Task"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
          />
        </div>
        <div className="calendar-task__row">
          <input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
          <input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} />
        </div>
        <button
          type="button"
          className="primary-btn calendar-task__submit"
          onClick={handleCreateEvent}
          disabled={isCreating}
        >
          {isCreating ? "Adding..." : "Add to calendar"}
        </button>
      </div>

      <TabBar />
    </div>
  );
};

export default Calendar;
