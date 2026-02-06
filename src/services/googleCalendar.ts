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
  mode: "server" | "client";
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

const rawFunctionsBaseUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined;
const normalizedFunctionsBaseUrl = rawFunctionsBaseUrl?.trim() || "";
const hasFunctionsBaseUrl = normalizedFunctionsBaseUrl.length > 0;
const isFunctionsBaseUrlValid = hasFunctionsBaseUrl && /^https?:\/\//i.test(normalizedFunctionsBaseUrl);
const functionsBaseUrl = isFunctionsBaseUrlValid ? normalizedFunctionsBaseUrl : "";

const TOKEN_STORAGE_KEY = "googleCalendarAccessToken";

export const calendarMode: CalendarStatus["mode"] = isFunctionsBaseUrlValid ? "server" : "client";

export const isServerCalendarMode = calendarMode === "server";

export const isClientCalendarMode = calendarMode === "client";

export const setCalendarAccessToken = (token: string | null) => {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const getCalendarAccessToken = () => {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
};

const getFunctionsBaseUrl = () => {
  if (!isFunctionsBaseUrlValid) {
    if (hasFunctionsBaseUrl) {
      throw new Error("Invalid VITE_FUNCTIONS_BASE_URL. Use a full http(s) URL.");
    }
    throw new Error("Missing VITE_FUNCTIONS_BASE_URL.");
  }
  return functionsBaseUrl.replace(/\/$/, "");
};

const handleFetchError = (error: unknown, fallback: string): never => {
  if (error instanceof TypeError) {
    throw new Error(fallback);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(fallback);
};

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit, fallback = "Network error.") => {
  try {
    return await fetch(input, init);
  } catch (error) {
    handleFetchError(error, fallback);
  }
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (isClientCalendarMode && (response.status === 401 || response.status === 403)) {
      setCalendarAccessToken(null);
      throw new Error("Session expired. Please reconnect Google Calendar.");
    }
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
  const response = await safeFetch(
    `${getFunctionsBaseUrl()}${path}`,
    {
      ...options,
      headers: {
        ...(options?.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    },
    "Unable to reach the Google Calendar service. Check your connection or the functions URL."
  );
  return response;
};

export const getCalendarAuthUrl = async () => {
  if (!isServerCalendarMode) {
    throw new Error("Server sync is not configured.");
  }
  const response = await authFetch("/oauth/url");
  const data = await parseJson<{ url: string }>(response);
  return data.url;
};

export const getCalendarStatus = async (): Promise<CalendarStatus> => {
  if (isServerCalendarMode) {
    const response = await authFetch("/calendar/status");
    const status = await parseJson<{ connected: boolean }>(response);
    return { connected: status.connected, mode: "server" };
  }
  return { connected: Boolean(getCalendarAccessToken()), mode: "client" };
};

export const listCalendarEvents = async (params: ListCalendarEventsParams = {}) => {
  const query = new URLSearchParams();
  query.set("singleEvents", "true");
  query.set("orderBy", "startTime");
  const timeMin = params.timeMin || new Date().toISOString();
  query.set("timeMin", timeMin);
  if (params.timeMax) query.set("timeMax", params.timeMax);
  if (params.maxResults) query.set("maxResults", String(params.maxResults));

  if (isServerCalendarMode) {
    const response = await authFetch(`/calendar/events?${query.toString()}`);
    const data = await parseJson<{ items: GoogleCalendarEvent[] }>(response);
    return data.items || [];
  }

  const token = getCalendarAccessToken();
  if (!token) {
    throw new Error("Google Calendar is not connected.");
  }
  const response = await safeFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    },
    "Unable to reach Google Calendar. Check your connection and try again."
  );
  const data = await parseJson<{ items: GoogleCalendarEvent[] }>(response);
  return data.items || [];
};

export const createCalendarEvent = async (input: CalendarEventInput) => {
  if (isServerCalendarMode) {
    const response = await authFetch("/calendar/events", {
      method: "POST",
      body: JSON.stringify(input)
    });
    return parseJson<GoogleCalendarEvent>(response);
  }

  const token = getCalendarAccessToken();
  if (!token) {
    throw new Error("Google Calendar is not connected.");
  }
  const response = await safeFetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start },
        end: { dateTime: input.end }
      })
    },
    "Unable to reach Google Calendar. Check your connection and try again."
  );
  return parseJson<GoogleCalendarEvent>(response);
};

export const updateCalendarEvent = async (eventId: string, input: CalendarEventInput) => {
  if (isServerCalendarMode) {
    const response = await authFetch(`/calendar/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    return parseJson<GoogleCalendarEvent>(response);
  }

  const token = getCalendarAccessToken();
  if (!token) {
    throw new Error("Google Calendar is not connected.");
  }
  const response = await safeFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start },
        end: { dateTime: input.end }
      })
    },
    "Unable to reach Google Calendar. Check your connection and try again."
  );
  return parseJson<GoogleCalendarEvent>(response);
};

export const deleteCalendarEvent = async (eventId: string) => {
  if (isServerCalendarMode) {
    const response = await authFetch(`/calendar/events/${eventId}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      await parseJson(response);
    }
    return;
  }

  const token = getCalendarAccessToken();
  if (!token) {
    throw new Error("Google Calendar is not connected.");
  }
  const response = await safeFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    },
    "Unable to reach Google Calendar. Check your connection and try again."
  );
  if (!response.ok) {
    await parseJson(response);
  }
};
