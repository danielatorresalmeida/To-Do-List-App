import type { Task } from "./tasks";
import { getTaskTimestamp } from "./taskView";

export interface SyncStatus {
  tone: "success" | "error";
  message: string;
}

export interface SyncWindow {
  earliest: Date;
  end: Date;
  timeMin: string;
  timeMax: string;
}

const DEFAULT_RANGE_DAYS = 180;

export const formatCountLabel = (value: number, singular: string, plural = `${singular}s`) =>
  `${value} ${value === 1 ? singular : plural}`;

export const buildSyncWindow = (tasks: Task[], now = new Date(), rangeDays = DEFAULT_RANGE_DAYS): SyncWindow => {
  const timestamps = tasks
    .map((task) => getTaskTimestamp(task))
    .filter((timestamp) => timestamp > 0);
  const earliest = timestamps.length ? new Date(Math.min(...timestamps)) : new Date(now);
  const end = new Date(earliest.getTime() + 1000 * 60 * 60 * 24 * rangeDays);

  return {
    earliest,
    end,
    timeMin: earliest.toISOString(),
    timeMax: end.toISOString()
  };
};

export const buildSyncOutcomeStatus = (input: {
  createdCount: number;
  failedCount: number;
  firstCreateError: string | null;
}): SyncStatus => {
  if (input.failedCount > 0) {
    const summary =
      input.createdCount > 0
        ? `${formatCountLabel(input.createdCount, "task")} synced, ${formatCountLabel(input.failedCount, "task")} failed.`
        : `${formatCountLabel(input.failedCount, "task")} failed to sync.`;

    return {
      tone: "error",
      message: input.firstCreateError ? `${summary} ${input.firstCreateError}` : summary
    };
  }

  if (input.createdCount > 0) {
    return {
      tone: "success",
      message: `${formatCountLabel(input.createdCount, "task")} synced with Google Calendar.`
    };
  }

  return {
    tone: "success",
    message: "Tasks synced with Google Calendar."
  };
};

export const buildSyncFailureStatus = (input: {
  message: string;
  createdCount: number;
  persistedProgress: boolean;
}): SyncStatus => {
  const prefix = input.persistedProgress && input.createdCount > 0 ? "Partial sync saved locally. " : "";
  return {
    tone: "error",
    message: `${prefix}${input.message}`
  };
};
