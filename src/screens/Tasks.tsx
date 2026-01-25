import React, { useEffect, useState } from "react";
import { HiMagnifyingGlass, HiChevronDown, HiPlus, HiChevronRight, HiOutlineArrowPath } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";
import { addTask, createTask, loadTasks, saveTasks, type Task } from "../services/tasks";
import {
  createCalendarEvent,
  getCalendarAuthUrl,
  getCalendarStatus,
  listCalendarEvents
} from "../services/googleCalendar";
import { buildCalendarEventPayload, mergeTasksFromEvents } from "../services/taskSync";

const Tasks: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [autoSync, setAutoSync] = useState(() => {
    if (typeof localStorage === "undefined") {
      return false;
    }
    return localStorage.getItem("calendarAutoSync") === "true";
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: (() => {
      const today = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    })(),
    dueTime: "09:00"
  });

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

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
    if (!autoSync || !calendarConnected) {
      return;
    }
    const runAutoSync = async () => {
      await handleSync({ silent: true });
    };
    runAutoSync();
  }, [autoSync, calendarConnected]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTask = async () => {
    if (!form.title.trim() || !form.dueDate || !form.dueTime) {
      setStatus({ tone: "error", message: "Add a title, date, and time for the task." });
      return;
    }

    setIsCreating(true);
    setStatus(null);
    try {
      const baseTask = createTask({
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        dueTime: form.dueTime
      });

      let nextTask = baseTask;
      let syncError: string | null = null;
      if (calendarConnected) {
        try {
          const payload = buildCalendarEventPayload(baseTask);
          const event = await createCalendarEvent(payload);
          nextTask = { ...baseTask, googleEventId: event.id };
        } catch (error) {
          syncError = error instanceof Error ? error.message : "Unable to sync task to Google Calendar.";
        }
      }

      const updated = addTask(tasks, nextTask);
      setTasks(updated);
      const today = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      setForm({
        title: "",
        description: "",
        dueDate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
        dueTime: "09:00"
      });
      setIsModalOpen(false);
      if (syncError) {
        setStatus({ tone: "error", message: `${syncError} Task saved locally.` });
      } else {
        setStatus({ tone: "success", message: "Task created." });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSync = async (options?: { silent?: boolean }) => {
    if (isSyncing) {
      return;
    }
    try {
      const connection = await getCalendarStatus();
      setCalendarConnected(connection.connected);
      if (!connection.connected) {
        if (!options?.silent) {
          setStatus({ tone: "error", message: "Connect Google Calendar to sync tasks." });
        }
        return;
      }
    } catch {
      setCalendarConnected(false);
      if (!options?.silent) {
        setStatus({ tone: "error", message: "Sign in to sync tasks with Google Calendar." });
      }
      return;
    }
    setIsSyncing(true);
    if (!options?.silent) {
      setStatus(null);
    }
    try {
      let nextTasks = [...tasks];
      for (const task of nextTasks) {
        if (!task.googleEventId) {
          const payload = buildCalendarEventPayload(task);
          const event = await createCalendarEvent(payload);
          task.googleEventId = event.id;
          task.updatedAt = new Date().toISOString();
        }
      }
      const dates = nextTasks
        .filter((task) => task.dueDate)
        .map((task) => new Date(`${task.dueDate}T${task.dueTime || "00:00"}`));
      const earliest = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : new Date();
      const timeMin = earliest.toISOString();
      const end = new Date(earliest.getTime() + 1000 * 60 * 60 * 24 * 180);
      const timeMax = end.toISOString();
      const events = await listCalendarEvents({ timeMin, timeMax, maxResults: 100 });
      nextTasks = mergeTasksFromEvents(nextTasks, events, { start: earliest, end });
      setTasks(saveTasks(nextTasks));
      if (!options?.silent) {
        setStatus({ tone: "success", message: "Tasks synced with Google Calendar." });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sync tasks.";
      setStatus({ tone: "error", message });
    } finally {
      setIsSyncing(false);
    }
  };

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
          if (autoSync && result.connected) {
            await handleSync({ silent: true });
          }
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
      setTimeout(() => setIsConnecting(false), 12000);
    }
  };

  const handleAutoSyncChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setAutoSync(value);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("calendarAutoSync", value ? "true" : "false");
    }
    if (value && calendarConnected) {
      handleSync({ silent: true });
    }
  };


  return (
    <div className="screen tasks">
      <div className="tasks__header">
        <label className="search-field">
          <HiMagnifyingGlass />
          <input type="text" placeholder="Search by task title" />
        </label>
        <button className="sort-btn" type="button">
          <span>Sort By:</span>
          <HiChevronDown />
        </button>
      </div>

      <div className="tasks-sync">
        <div>
          <h3>Google Calendar</h3>
          <p>{calendarConnected ? "Connected" : "Not connected"}</p>
        </div>
        <div className="tasks-sync__actions">
          <button className="ghost-btn" type="button" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : calendarConnected ? "Reconnect" : "Connect"}
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => handleSync()}
            disabled={isSyncing || !calendarConnected}
          >
            <HiOutlineArrowPath />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
          <label className="tasks-sync__toggle">
            <input type="checkbox" checked={autoSync} onChange={handleAutoSyncChange} />
            Auto-sync
          </label>
        </div>
      </div>

      {status ? (
        <div className={`status-pill ${status.tone === "success" ? "status-pill--success" : "status-pill--error"}`}>
          {status.message}
        </div>
      ) : null}

      <h2 className="section-title">Tasks List</h2>

      {tasks.length ? (
        tasks.map((task) => (
          <Link key={task.id} to={`/tasks/${task.id}`} className={`task-row${task.isCompleted ? " task-row--done" : ""}`}>
            <div>
              <h4>{task.title}</h4>
              <p>
                {task.dueDate} | {task.dueTime}
              </p>
            </div>
            <HiChevronRight />
          </Link>
        ))
      ) : (
        <p className="calendar-empty">No tasks yet. Add one to get started.</p>
      )}

      <button className="fab" type="button" onClick={() => setIsModalOpen(true)} aria-label="Create task">
        <HiPlus />
      </button>

      <TabBar />

      {isModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--form">
            <label className="input-field input-field--dark">
              <span className="input-icon">
                <HiPlus />
              </span>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="task"
              />
            </label>
            <label className="input-field input-field--dark input-field--textarea">
              <span className="input-icon">
                <span className="bars-icon" aria-hidden="true" />
              </span>
              <textarea
                name="description"
                placeholder="Description"
                rows={4}
                value={form.description}
                onChange={handleChange}
              />
            </label>
            <div className="inline-fields">
              <label className="input-field input-field--dark">
                <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
              </label>
              <label className="input-field input-field--dark">
                <input type="time" name="dueTime" value={form.dueTime} onChange={handleChange} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>
                cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCreateTask} disabled={isCreating}>
                {isCreating ? "creating..." : "create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Tasks;
