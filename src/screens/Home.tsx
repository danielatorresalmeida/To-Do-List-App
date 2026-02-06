import React, { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { HiChevronRight, HiBell } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";
import { auth } from "../services/firebase";
import { getCalendarStatus, listCalendarEvents } from "../services/googleCalendar";
import { mergeTasksFromEvents } from "../services/taskSync";
import { loadTasks, saveTasks, type Task } from "../services/tasks";

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
  const previousTasksRef = useRef<Task[]>([]);
  const previousUpcomingCountRef = useRef(0);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const stored = loadTasks();
    setTasks(stored);
    previousTasksRef.current = stored;
  }, []);

  const showToast = (next: { tone: "success" | "warning"; message: string }) => {
    setToast(next);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const maybeNotify = async (title: string, body: string, allowPrompt: boolean) => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body });
      return;
    }
    if (Notification.permission === "default" && allowPrompt) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, { body });
      }
    }
  };

  const getUpcomingCount = (list: Task[]) => {
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000);
    return list.filter((task) => {
      if (!task.googleEventId || task.isCompleted) {
        return false;
      }
      const taskDate = getTaskDateTime(task);
      return taskDate >= now && taskDate <= soon;
    }).length;
  };

  const syncFromCalendar = async (options?: { notify?: boolean }) => {
    try {
      const status = await getCalendarStatus();
      setCalendarConnected(status.connected);
      if (!status.connected) {
        return;
      }
      const now = new Date();
      const timeMin = now.toISOString();
      const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
      const timeMax = end.toISOString();
      const events = await listCalendarEvents({ timeMin, timeMax, maxResults: 20 });
      const current = loadTasks();
      const merged = mergeTasksFromEvents(current, events, { start: now, end });
      setTasks(saveTasks(merged));

      const previousByEvent = new Map(
        previousTasksRef.current.filter((task) => task.googleEventId).map((task) => [task.googleEventId!, task])
      );
      const updatedCount = merged.reduce((count, task) => {
        if (!task.googleEventId) {
          return count;
        }
        const previous = previousByEvent.get(task.googleEventId);
        if (!previous) {
          return count;
        }
        if (
          previous.title !== task.title ||
          previous.description !== task.description ||
          previous.dueDate !== task.dueDate ||
          previous.dueTime !== task.dueTime
        ) {
          return count + 1;
        }
        return count;
      }, 0);

      const upcomingCount = getUpcomingCount(merged);
      if (upcomingCount > 0 && upcomingCount !== previousUpcomingCountRef.current) {
        showToast({
          tone: "warning",
          message:
            upcomingCount === 1
              ? "1 event starts within the next hour."
              : `${upcomingCount} events start within the next hour.`
        });
        await maybeNotify(
          "Upcoming event",
          upcomingCount === 1
            ? "You have an event starting within the next hour."
            : `${upcomingCount} events start within the next hour.`,
          Boolean(options?.notify)
        );
      }

      if (updatedCount > 0) {
        showToast({
          tone: "success",
          message: updatedCount === 1 ? "1 calendar event was updated." : `${updatedCount} calendar events were updated.`
        });
        await maybeNotify(
          "Calendar updated",
          updatedCount === 1 ? "1 calendar event was updated." : `${updatedCount} calendar events were updated.`,
          Boolean(options?.notify)
        );
      }

      previousTasksRef.current = merged;
      previousUpcomingCountRef.current = upcomingCount;
    } catch {
      setCalendarConnected(false);
    }
  };

  useEffect(() => {
    syncFromCalendar();
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    await syncFromCalendar({ notify: true });
    setIsRefreshing(false);
  };

  const displayName = user?.displayName || "Guest";
  const email = user?.email || "guest@example.com";
  const photoUrl = user?.photoURL || "";
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "G";
    }
    return parts
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName]);

  const getTaskDateTime = (task: Task) => new Date(`${task.dueDate}T${task.dueTime || "00:00"}`);

  const formatTaskTime = (task: Task) => {
    const taskDate = getTaskDateTime(task);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isSameDay = (left: Date, right: Date) =>
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();
    const dayLabel = isSameDay(taskDate, today)
      ? "Today"
      : isSameDay(taskDate, tomorrow)
        ? "Tomorrow"
        : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(taskDate);
    const timeLabel = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(taskDate);
    return `${dayLabel} | ${timeLabel}`;
  };

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime()),
    [tasks]
  );

  const groupTasks = useMemo(
    () => sortedTasks.filter((task) => task.googleEventId).slice(0, 2),
    [sortedTasks]
  );

  const incompleteTasks = useMemo(
    () => sortedTasks.filter((task) => !task.isCompleted).slice(0, 3),
    [sortedTasks]
  );

  const completedTasks = useMemo(
    () => sortedTasks.filter((task) => task.isCompleted).slice(0, 3),
    [sortedTasks]
  );

  const upcomingCount = useMemo(() => getUpcomingCount(tasks), [tasks]);

  return (
    <div className="screen home">
      <div className="home__header">
        <div className="profile-chip">
          <div className="profile-avatar">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} />
            ) : (
              <span className="avatar-initials">{initials}</span>
            )}
            <div className="avatar-ring" />
          </div>
          <div>
            <h2>{displayName}</h2>
            <p>{email}</p>
          </div>
        </div>
        <div className="notif">
          <HiBell />
          {upcomingCount > 0 ? <span className="notif__count">{upcomingCount}</span> : null}
        </div>
      </div>
      {toast ? (
        <div className={`status-pill ${toast.tone === "warning" ? "status-pill--warning" : "status-pill--success"}`}>
          {toast.message}
        </div>
      ) : null}

      <section className="home__section">
        <div className="home__section-header">
          <h3>Group tasks</h3>
          <button
            type="button"
            className="ghost-btn home-refresh"
            onClick={handleRefresh}
            disabled={isRefreshing || !calendarConnected}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {groupTasks.length ? (
          groupTasks.map((task) => (
            <div key={task.id} className="card card--soft">
              <div>
                <h4>{task.title}</h4>
                <p>{formatTaskTime(task)}</p>
                <div className="avatar-stack">
                  <span className="avatar-dot" />
                  <span className="avatar-dot" />
                  <span className="avatar-dot avatar-dot--ghost">+</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="calendar-empty">
            {calendarConnected ? "No upcoming calendar events." : "Connect Google Calendar to see tasks here."}
          </p>
        )}
      </section>

      <section className="home__section">
        <h3>Incomplete Tasks</h3>
        {incompleteTasks.length ? (
          incompleteTasks.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="task-row">
              <div>
                <h4>{task.title}</h4>
                <p>{formatTaskTime(task)}</p>
              </div>
              <HiChevronRight />
            </Link>
          ))
        ) : (
          <p className="calendar-empty">No incomplete tasks yet.</p>
        )}
      </section>

      <section className="home__section home__section--last">
        <h3>Completed Tasks</h3>
        {completedTasks.length ? (
          completedTasks.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="task-row task-row--done">
              <div>
                <h4>{task.title}</h4>
                <p>{formatTaskTime(task)}</p>
              </div>
              <HiChevronRight />
            </Link>
          ))
        ) : (
          <p className="calendar-empty">No completed tasks yet.</p>
        )}
      </section>

      <TabBar />
    </div>
  );
};

export default Home;
