import { describe, expect, it } from "vitest";
import type { Task } from "./tasks";
import {
  buildSyncFailureStatus,
  buildSyncOutcomeStatus,
  buildSyncWindow,
  formatCountLabel
} from "./taskSyncState";

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

describe("buildSyncWindow", () => {
  it("uses earliest valid task timestamp", () => {
    const tasks = [
      makeTask({ id: "a", dueDate: "2026-04-01", dueTime: "10:00" }),
      makeTask({ id: "b", dueDate: "2026-03-01", dueTime: "08:00" }),
      makeTask({ id: "c", dueDate: "invalid", dueTime: "invalid" })
    ];

    const window = buildSyncWindow(tasks, new Date("2026-03-27T12:00:00.000Z"), 10);
    expect(window.earliest.toISOString()).toBe("2026-03-01T08:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-03-11T08:00:00.000Z");
  });

  it("falls back to now when no valid task timestamps are present", () => {
    const now = new Date("2026-03-27T12:00:00.000Z");
    const tasks = [makeTask({ dueDate: "invalid", dueTime: "invalid" })];

    const window = buildSyncWindow(tasks, now, 1);
    expect(window.earliest.toISOString()).toBe(now.toISOString());
    expect(window.end.toISOString()).toBe("2026-03-28T12:00:00.000Z");
  });
});

describe("buildSyncOutcomeStatus", () => {
  it("returns partial failure message when some tasks fail", () => {
    const status = buildSyncOutcomeStatus({
      createdCount: 2,
      failedCount: 1,
      firstCreateError: "rate limit"
    });

    expect(status.tone).toBe("error");
    expect(status.message).toBe("2 tasks synced, 1 task failed. rate limit");
  });
});

describe("buildSyncFailureStatus", () => {
  it("prepends partial-sync message when progress was persisted", () => {
    const status = buildSyncFailureStatus({
      message: "Unable to sync tasks.",
      createdCount: 1,
      persistedProgress: true
    });

    expect(status.tone).toBe("error");
    expect(status.message).toBe("Partial sync saved locally. Unable to sync tasks.");
  });
});

describe("formatCountLabel", () => {
  it("pluralizes by count", () => {
    expect(formatCountLabel(1, "task")).toBe("1 task");
    expect(formatCountLabel(2, "task")).toBe("2 tasks");
  });
});
