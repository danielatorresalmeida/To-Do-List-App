import React, { useEffect, useMemo, useRef, useState } from "react";
import { HiMagnifyingGlass, HiPlus, HiChevronRight, HiOutlineArrowPath } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";
import { addTask, createTask, loadTasks, saveTasks, type Task } from "../services/tasks";
import {
  createCalendarEvent,
  getCalendarAuthUrl,
  getCalendarStatus,
  isClientCalendarMode,
  isServerCalendarMode,
  listCalendarEvents,
  setCalendarAccessToken
} from "../services/googleCalendar";
import { buildCalendarEventPayload, mergeTasksFromEvents } from "../services/taskSync";
import { connectGoogleCalendar } from "../services/auth";
import {
  type TaskSortOption,
  type TaskStatusFilter,
  getVisibleTasks
} from "../services/taskView";
import {
  buildSyncFailureStatus,
  buildSyncOutcomeStatus,
  buildSyncWindow
} from "../services/taskSyncState";

const SEARCH_DEBOUNCE_MS = 180;

const getTodayDate = () => {
  const today = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

const DEFAULT_DUE_TIME = "09:00";

const Tasks: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [filterBy, setFilterBy] = useState<TaskStatusFilter>("all");
  const [sortBy, setSortBy] = useState<TaskSortOption>("due-soonest");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
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
    dueDate: getTodayDate(),
    dueTime: DEFAULT_DUE_TIME
  });
  const tasksRef = useRef<Task[]>([]);
  const syncInFlightRef = useRef(false);
  const syncQueuedRef = useRef(false);
  const queuedSilentRef = useRef(true);

  useEffect(() => {
    const stored = loadTasks();
    tasksRef.current = stored;
    setTasks(stored);
  }, []);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(queryInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [queryInput]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await getCalendarStatus();
        setCalendarConnected(result.connected);
        if (result.connected) {
          setSessionExpired(false);
        }
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
    queueSync({ silent: true });
  }, [autoSync, calendarConnected]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const visibleTasks = useMemo(
    () =>
      getVisibleTasks(tasks, {
        query,
        filterBy,
        sortBy
      }),
    [tasks, query, filterBy, sortBy]
  );

  const resetTaskForm = () => {
    setForm({
      title: "",
      description: "",
      dueDate: getTodayDate(),
      dueTime: DEFAULT_DUE_TIME
    });
  };

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

      setTasks((prev) => {
        const updated = addTask(prev, nextTask);
        tasksRef.current = updated;
        return updated;
      });
      resetTaskForm();
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

  const runSyncOnce = async (options?: { silent?: boolean }) => {
    let createdCount = 0;
    let persistedProgress = false;

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

    if (!options?.silent) {
      setStatus(null);
    }

    try {
      let nextTasks = loadTasks().map((task) => ({ ...task }));
      if (!nextTasks.length) {
        nextTasks = tasksRef.current.map((task) => ({ ...task }));
      }

      let failedCount = 0;
      let firstCreateError: string | null = null;

      for (const task of nextTasks) {
        if (!task.googleEventId) {
          try {
            const payload = buildCalendarEventPayload(task);
            const event = await createCalendarEvent(payload);
            task.googleEventId = event.id;
            task.updatedAt = new Date().toISOString();
            createdCount += 1;
          } catch (error) {
            failedCount += 1;
            if (!firstCreateError) {
              firstCreateError = error instanceof Error ? error.message : "Unable to sync task to Google Calendar.";
            }
          }
        }
      }

      // Persist successful event IDs before fetching remote events to prevent duplicate event creation on retries.
      nextTasks = saveTasks(nextTasks);
      tasksRef.current = nextTasks;
      setTasks(nextTasks);
      persistedProgress = true;

      const syncWindow = buildSyncWindow(nextTasks);
      const events = await listCalendarEvents({
        timeMin: syncWindow.timeMin,
        timeMax: syncWindow.timeMax,
        maxResults: 100
      });

      nextTasks = mergeTasksFromEvents(nextTasks, events, {
        start: syncWindow.earliest,
        end: syncWindow.end
      });
      nextTasks = saveTasks(nextTasks);
      tasksRef.current = nextTasks;
      setTasks(nextTasks);

      if (!options?.silent) {
        setStatus(buildSyncOutcomeStatus({ createdCount, failedCount, firstCreateError }));
      }
      setSessionExpired(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sync tasks.";
      setStatus(
        buildSyncFailureStatus({
          message,
          createdCount,
          persistedProgress
        })
      );
      setSessionExpired(message.toLowerCase().includes("session expired"));
    }
  };

  const runQueuedSync = async () => {
    if (syncInFlightRef.current) {
      return;
    }
    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      while (syncQueuedRef.current) {
        syncQueuedRef.current = false;
        const silent = queuedSilentRef.current;
        queuedSilentRef.current = true;
        await runSyncOnce({ silent });
      }
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  };

  const queueSync = (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      queuedSilentRef.current = false;
    }
    syncQueuedRef.current = true;
    void runQueuedSync();
  };

  const handleConnect = async () => {
    setStatus(null);
    setIsConnecting(true);
    try {
      if (isServerCalendarMode) {
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
            setSessionExpired(false);
            if (autoSync && result.connected) {
              queueSync({ silent: true });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to confirm connection.";
            setStatus({ tone: "error", message });
          } finally {
            setIsConnecting(false);
          }
        };
        window.addEventListener("message", handleMessage, { once: true });
      } else {
        const result = await connectGoogleCalendar();
        setCalendarAccessToken(result.accessToken);
        setCalendarConnected(true);
        setStatus({ tone: "success", message: "Google Calendar connected successfully." });
        setSessionExpired(false);
        if (autoSync) {
          queueSync({ silent: true });
        }
        setIsConnecting(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect Google Calendar.";
      setStatus({ tone: "error", message });
      setSessionExpired(message.toLowerCase().includes("session expired"));
      setIsConnecting(false);
    } finally {
      if (isServerCalendarMode) {
        setTimeout(() => setIsConnecting(false), 12000);
      }
    }
  };

  const handleAutoSyncChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setAutoSync(value);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("calendarAutoSync", value ? "true" : "false");
    }
    if (value && calendarConnected) {
      queueSync({ silent: true });
    }
  };


  return (
    <div className="screen tasks">
      <div className="tasks__header">
        <label className="search-field">
          <HiMagnifyingGlass />
          <input
            type="text"
            placeholder="Search by title or description"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            aria-label="Search tasks"
          />
        </label>
        <label className="sort-field">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as TaskSortOption)} aria-label="Sort tasks">
            <option value="due-soonest">Due soonest</option>
            <option value="due-latest">Due latest</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="recently-updated">Recently updated</option>
          </select>
        </label>
      </div>
      <div className="tasks__filters" role="group" aria-label="Filter tasks by status">
        <button
          type="button"
          className={`filter-chip${filterBy === "all" ? " filter-chip--active" : ""}`}
          onClick={() => setFilterBy("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-chip${filterBy === "pending" ? " filter-chip--active" : ""}`}
          onClick={() => setFilterBy("pending")}
        >
          Pending
        </button>
        <button
          type="button"
          className={`filter-chip${filterBy === "completed" ? " filter-chip--active" : ""}`}
          onClick={() => setFilterBy("completed")}
        >
          Completed
        </button>
      </div>
      <p className="tasks__summary">
        Showing {visibleTasks.length} of {tasks.length} tasks
      </p>

      <div className="tasks-sync">
        <div>
          <h3>Google Calendar</h3>
          <p>{calendarConnected ? "Connected" : isClientCalendarMode ? "Client-only mode" : "Not connected"}</p>
        </div>
        <div className="tasks-sync__actions">
          <button
            className="ghost-btn"
            type="button"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : calendarConnected ? "Reconnect" : "Connect"}
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => queueSync()}
            disabled={isSyncing || !calendarConnected}
          >
            <HiOutlineArrowPath />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
          <label className="tasks-sync__toggle">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={handleAutoSyncChange}
            />
            Auto-sync
          </label>
        </div>
      </div>
      {sessionExpired ? <p className="tasks-sync__hint">Session expired. Click Connect to reauthorize.</p> : null}

      {status ? (
        <div className={`status-pill ${status.tone === "success" ? "status-pill--success" : "status-pill--error"}`}>
          {status.message}
        </div>
      ) : null}

      <h2 className="section-title">Tasks List</h2>

      {tasks.length ? (
        visibleTasks.length ? (
          visibleTasks.map((task) => (
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
          <p className="calendar-empty">No tasks match your current search and filters.</p>
        )
      ) : (
        <p className="calendar-empty">No tasks yet. Add one to get started.</p>
      )}

      <button className="fab" type="button" onClick={() => setIsModalOpen(true)} aria-label="Create task">
        <HiPlus />
      </button>

      <TabBar />

      {isModalOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-title"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isCreating) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="modal-card modal-card--form">
            <h3 id="create-task-title">Create task</h3>
            <form
              className="modal-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateTask();
              }}
            >
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
                <button type="submit" className="primary-btn" disabled={isCreating}>
                  {isCreating ? "creating..." : "create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Tasks;
