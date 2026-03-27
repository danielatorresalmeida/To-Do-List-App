import type { Task } from "./tasks";

export type TaskStatusFilter = "all" | "pending" | "completed";
export type TaskSortOption = "due-soonest" | "due-latest" | "title-asc" | "title-desc" | "recently-updated";

export interface TaskViewOptions {
  query: string;
  filterBy: TaskStatusFilter;
  sortBy: TaskSortOption;
}

export const getTaskTimestamp = (task: Pick<Task, "dueDate" | "dueTime">) => {
  const parsed = new Date(`${task.dueDate}T${task.dueTime || "00:00"}`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getVisibleTasks = (tasks: Task[], options: TaskViewOptions) => {
  const normalizedQuery = options.query.trim().toLowerCase();

  const matchesFilter = (task: Task) => {
    if (options.filterBy === "all") {
      return true;
    }
    if (options.filterBy === "completed") {
      return task.isCompleted;
    }
    return !task.isCompleted;
  };

  const matchesQuery = (task: Task) =>
    !normalizedQuery ||
    task.title.toLowerCase().includes(normalizedQuery) ||
    (task.description ?? "").toLowerCase().includes(normalizedQuery);

  const filtered = tasks.filter((task) => matchesFilter(task) && matchesQuery(task));
  return filtered.sort((left, right) => {
    if (options.sortBy === "due-latest") {
      return getTaskTimestamp(right) - getTaskTimestamp(left);
    }
    if (options.sortBy === "title-asc") {
      return left.title.localeCompare(right.title);
    }
    if (options.sortBy === "title-desc") {
      return right.title.localeCompare(left.title);
    }
    if (options.sortBy === "recently-updated") {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }
    return getTaskTimestamp(left) - getTaskTimestamp(right);
  });
};
