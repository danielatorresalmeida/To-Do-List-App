import { describe, expect, it } from "vitest";
import type { Task } from "./tasks";
import { getTaskTimestamp, getVisibleTasks } from "./taskView";

const makeTask = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "task-id",
  title: overrides.title ?? "Untitled",
  description: overrides.description ?? "",
  category: overrides.category ?? "",
  dueDate: overrides.dueDate ?? "2026-03-20",
  dueTime: overrides.dueTime ?? "09:00",
  isCompleted: overrides.isCompleted ?? false,
  googleEventId: overrides.googleEventId,
  syncSource: overrides.syncSource ?? "local",
  updatedAt: overrides.updatedAt ?? "2026-03-20T09:00:00.000Z"
});

describe("getVisibleTasks", () => {
  it("filters by query and completion state", () => {
    const tasks = [
      makeTask({ id: "1", title: "Client meeting", description: "Kickoff agenda", isCompleted: false }),
      makeTask({ id: "2", title: "Design review", description: "Homepage", isCompleted: true }),
      makeTask({ id: "3", title: "Inbox cleanup", description: "client notes", isCompleted: false })
    ];

    const result = getVisibleTasks(tasks, {
      query: "client",
      filterBy: "pending",
      sortBy: "due-soonest"
    });

    expect(result.map((task) => task.id)).toEqual(["1", "3"]);
  });

  it("sorts by due date ascending and descending", () => {
    const tasks = [
      makeTask({ id: "early", dueDate: "2026-03-01", dueTime: "10:00" }),
      makeTask({ id: "mid", dueDate: "2026-03-02", dueTime: "10:00" }),
      makeTask({ id: "late", dueDate: "2026-03-03", dueTime: "10:00" })
    ];

    const soonest = getVisibleTasks(tasks, { query: "", filterBy: "all", sortBy: "due-soonest" });
    const latest = getVisibleTasks(tasks, { query: "", filterBy: "all", sortBy: "due-latest" });

    expect(soonest.map((task) => task.id)).toEqual(["early", "mid", "late"]);
    expect(latest.map((task) => task.id)).toEqual(["late", "mid", "early"]);
  });
});

describe("getTaskTimestamp", () => {
  it("returns 0 for invalid task date/time", () => {
    const invalid = makeTask({ dueDate: "not-a-date", dueTime: "not-a-time" });
    expect(getTaskTimestamp(invalid)).toBe(0);
  });
});
