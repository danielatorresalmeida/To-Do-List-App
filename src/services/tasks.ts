export type TaskSyncSource = "local" | "google";

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  dueDate: string;
  dueTime: string;
  isCompleted: boolean;
  googleEventId?: string;
  syncSource?: TaskSyncSource;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  category?: string;
  dueDate: string;
  dueTime: string;
}

const STORAGE_KEY = "tasks";
const DEFAULT_TIME = "09:00";

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
};

const normalizeTask = (raw: Record<string, unknown>): Task => {
  if ("title" in raw && typeof raw.title === "string" && "dueDate" in raw && typeof raw.dueDate === "string") {
    return {
      id: typeof raw.id === "string" ? raw.id : generateId(),
      title: raw.title,
      description: typeof raw.description === "string" ? raw.description : "",
      category: typeof raw.category === "string" ? raw.category : "",
      dueDate: raw.dueDate,
      dueTime: typeof raw.dueTime === "string" && raw.dueTime ? raw.dueTime : DEFAULT_TIME,
      isCompleted: Boolean(raw.isCompleted),
      googleEventId: typeof raw.googleEventId === "string" ? raw.googleEventId : undefined,
      syncSource: raw.syncSource === "google" ? "google" : "local",
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()
    };
  }

  const legacyText =
    typeof raw.text === "string" ? raw.text : typeof raw.taskText === "string" ? raw.taskText : "Untitled task";
  const legacyDate = typeof raw.date === "string" && raw.date ? raw.date : formatDate(new Date());
  return {
    id: typeof raw.id === "string" ? raw.id : generateId(),
    title: legacyText,
    description: "",
    category: typeof raw.category === "string" ? raw.category : "",
    dueDate: legacyDate,
    dueTime: DEFAULT_TIME,
    isCompleted: Boolean(raw.isCompleted),
    googleEventId: typeof raw.googleEventId === "string" ? raw.googleEventId : undefined,
    syncSource: "local",
    updatedAt: new Date().toISOString()
  };
};

export const loadTasks = (): Task[] => {
  if (typeof localStorage === "undefined") {
    return [];
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const normalized = parsed.map((item) => normalizeTask(item as Record<string, unknown>));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
};

export const saveTasks = (tasks: Task[]) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
  return tasks;
};

export const createTask = (input: TaskInput, overrides?: Partial<Task>): Task => ({
  id: overrides?.id ?? generateId(),
  title: input.title.trim(),
  description: input.description?.trim() ?? "",
  category: input.category?.trim() ?? "",
  dueDate: input.dueDate,
  dueTime: input.dueTime || DEFAULT_TIME,
  isCompleted: overrides?.isCompleted ?? false,
  googleEventId: overrides?.googleEventId,
  syncSource: overrides?.syncSource ?? "local",
  updatedAt: new Date().toISOString()
});

export const addTask = (tasks: Task[], task: Task) => saveTasks([task, ...tasks]);

export const updateTask = (tasks: Task[], updated: Task) => {
  const next = tasks.map((task) => (task.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : task));
  return saveTasks(next);
};

export const removeTask = (tasks: Task[], taskId: string) => saveTasks(tasks.filter((task) => task.id !== taskId));

export const getTaskById = (taskId: string) => loadTasks().find((task) => task.id === taskId) ?? null;

export const buildEventTimes = (dueDate: string, dueTime: string, durationMinutes = 60) => {
  const [year, month, day] = dueDate.split("-").map(Number);
  const [hour, minute] = dueTime.split(":").map(Number);
  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return { startDate, endDate };
};

export const formatRfc3339 = (date: Date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absMinutes / 60);
  const offsetMins = absMinutes % 60;
  return `${formatDate(date)}T${formatTime(date)}:00${sign}${pad(offsetHours)}:${pad(offsetMins)}`;
};
