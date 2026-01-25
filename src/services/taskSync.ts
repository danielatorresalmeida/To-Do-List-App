import { type GoogleCalendarEvent } from "./googleCalendar";
import {
  type Task,
  type TaskInput,
  createTask,
  formatDate,
  formatTime,
  buildEventTimes,
  formatRfc3339
} from "./tasks";

const DEFAULT_TIME = "09:00";

const getEventStart = (event: GoogleCalendarEvent) => {
  if (event.start?.dateTime) {
    return new Date(event.start.dateTime);
  }
  if (event.start?.date) {
    return new Date(`${event.start.date}T00:00:00`);
  }
  return null;
};

const getEventDescription = (event: GoogleCalendarEvent) =>
  typeof event.description === "string" ? event.description : "";

export const eventToTaskInput = (event: GoogleCalendarEvent): TaskInput => {
  const start = getEventStart(event) ?? new Date();
  return {
    title: event.summary || "Untitled event",
    description: getEventDescription(event),
    dueDate: formatDate(start),
    dueTime: event.start?.dateTime ? formatTime(start) : DEFAULT_TIME,
    category: "Google Calendar"
  };
};

export const mergeTasksFromEvents = (
  tasks: Task[],
  events: GoogleCalendarEvent[],
  range?: { start?: Date; end?: Date }
) => {
  const eventIds = new Set(events.map((event) => event.id));
  const taskByEventId = new Map(tasks.filter((task) => task.googleEventId).map((task) => [task.googleEventId!, task]));

  const isWithinRange = (task: Task) => {
    if (!range?.start && !range?.end) {
      return true;
    }
    const taskDate = new Date(`${task.dueDate}T${task.dueTime || DEFAULT_TIME}`);
    if (range?.start && taskDate < range.start) {
      return false;
    }
    if (range?.end && taskDate > range.end) {
      return false;
    }
    return true;
  };

  const merged: Task[] = tasks.filter((task) => {
    if (
      task.syncSource === "google" &&
      task.googleEventId &&
      !eventIds.has(task.googleEventId) &&
      isWithinRange(task)
    ) {
      return false;
    }
    return true;
  });

  events.forEach((event) => {
    const existing = taskByEventId.get(event.id);
    const input = eventToTaskInput(event);
    if (existing) {
      const updated: Task = {
        ...existing,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        dueTime: input.dueTime,
        googleEventId: event.id,
        syncSource: existing.syncSource ?? "google",
        updatedAt: new Date().toISOString()
      };
      const index = merged.findIndex((task) => task.id === existing.id);
      if (index >= 0) {
        merged[index] = updated;
      } else {
        merged.push(updated);
      }
    } else {
      merged.unshift(
        createTask(input, {
          googleEventId: event.id,
          syncSource: "google"
        })
      );
    }
  });

  return merged;
};

export const buildCalendarEventPayload = (task: Task) => {
  const { startDate, endDate } = buildEventTimes(task.dueDate, task.dueTime);
  return {
    summary: task.title,
    description: task.description || undefined,
    start: formatRfc3339(startDate),
    end: formatRfc3339(endDate)
  };
};
