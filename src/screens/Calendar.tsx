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
import { addTask, createTask, loadTasks } from "../services/tasks";
import { buildCalendarEventPayload } from "../services/taskSync";

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
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(() => {
    const today = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  });
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
