import { getIdToken } from "./auth";

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
}

export interface CalendarStatus {
  connected: boolean;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: string;
  end: string;
}

export interface ListCalendarEventsParams {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

const getFunctionsBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined;
  if (!baseUrl) {
    throw new Error("Missing VITE_FUNCTIONS_BASE_URL. Add it to your .env file.");
  }
  return baseUrl.replace(/\/$/, "");
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string })?.message ||
      (payload as { error?: string; message?: string })?.error ||
      "Request failed.";
    throw new Error(message);
  }
  return payload as T;
};

const authFetch = async (path: string, options?: RequestInit) => {
  const token = await getIdToken();
  const response = await fetch(`${getFunctionsBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  return response;
};

export const getCalendarAuthUrl = async () => {
  const response = await authFetch("/oauth/url");
  const data = await parseJson<{ url: string }>(response);
  return data.url;
};

export const getCalendarStatus = async (): Promise<CalendarStatus> => {
  const response = await authFetch("/calendar/status");
  return parseJson<CalendarStatus>(response);
};

export const listCalendarEvents = async (params: ListCalendarEventsParams = {}) => {
  const query = new URLSearchParams();
  if (params.timeMin) query.set("timeMin", params.timeMin);
  if (params.timeMax) query.set("timeMax", params.timeMax);
  if (params.maxResults) query.set("maxResults", String(params.maxResults));
  const response = await authFetch(`/calendar/events?${query.toString()}`);
  const data = await parseJson<{ items: GoogleCalendarEvent[] }>(response);
  return data.items || [];
};

export const createCalendarEvent = async (input: CalendarEventInput) => {
  const response = await authFetch("/calendar/events", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return parseJson<GoogleCalendarEvent>(response);
};

export const updateCalendarEvent = async (eventId: string, input: CalendarEventInput) => {
  const response = await authFetch(`/calendar/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return parseJson<GoogleCalendarEvent>(response);
};

export const deleteCalendarEvent = async (eventId: string) => {
  const response = await authFetch(`/calendar/events/${eventId}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    await parseJson(response);
  }
};
