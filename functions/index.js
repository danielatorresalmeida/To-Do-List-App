const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const AUTH_STATE_COLLECTION = "calendarAuthStates";
const TOKEN_COLLECTION = "calendarTokens";
const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const STATE_TTL_MS = 10 * 60 * 1000;

const getOAuthConfig = () => {
  const config = functions.config?.() || {};
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || config.google?.oauth_client_id;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || config.google?.oauth_client_secret;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth configuration.");
  }
  return { clientId, clientSecret };
};

const getRedirectUri = (req) => {
  const forwarded = req.headers["x-forwarded-proto"];
  const protocol = forwarded ? forwarded.split(",")[0] : req.protocol || "https";
  return `${protocol}://${req.get("host")}/oauth/callback`;
};

const renderHtml = (title, message, success = false) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background:#0b1626; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; }
      .card { background:#142338; padding:24px; border-radius:16px; max-width:420px; text-align:center; }
      .card h1 { margin-bottom:12px; font-size:20px; }
      .card p { color:#cfe2ff; }
      .badge { display:inline-block; padding:6px 12px; border-radius:999px; margin-bottom:12px; background:${success ? "#3bd87f" : "#ff5a5f"}; color:#0b1626; font-weight:600; }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="badge">${success ? "Connected" : "Error"}</span>
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
    <script>
      if (${success}) {
        window.opener?.postMessage({ type: "google-calendar-connected" }, "*");
        setTimeout(() => window.close(), 1200);
      }
    </script>
  </body>
</html>`;

const extractBearer = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: "Missing Firebase ID token." });
      return;
    }
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized." });
  }
};

const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    res.status(400).json({ error: message });
  }
};

const exchangeCodeForTokens = async ({ code, redirectUri }) => {
  const { clientId, clientSecret } = getOAuthConfig();
  const payload = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || "Unable to exchange OAuth code.");
  }
  return data;
};

const refreshAccessToken = async (refreshToken) => {
  const { clientId, clientSecret } = getOAuthConfig();
  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || "Unable to refresh Google token.");
  }
  return data;
};

const getUserTokenDoc = async (uid) => {
  const doc = await db.collection(TOKEN_COLLECTION).doc(uid).get();
  if (!doc.exists) {
    throw new Error("Google Calendar is not connected.");
  }
  return { docRef: doc.ref, data: doc.data() };
};

const getAccessToken = async (uid) => {
  const { docRef, data } = await getUserTokenDoc(uid);
  const now = Date.now();
  if (data.accessToken && data.expiryDate && now < data.expiryDate - 60 * 1000) {
    return data.accessToken;
  }
  if (!data.refreshToken) {
    throw new Error("Missing Google refresh token.");
  }
  const refreshed = await refreshAccessToken(data.refreshToken);
  const expiryDate = now + refreshed.expires_in * 1000;
  await docRef.set(
    {
      accessToken: refreshed.access_token,
      expiryDate,
      tokenType: refreshed.token_type,
      scope: refreshed.scope,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return refreshed.access_token;
};

const callCalendarApi = async (accessToken, path, options = {}) => {
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || "Google Calendar request failed.";
    throw new Error(message);
  }
  return data;
};

app.get(
  "/oauth/url",
  requireAuth,
  wrap(async (req, res) => {
    const { clientId } = getOAuthConfig();
    const state = crypto.randomBytes(16).toString("hex");
    await db.collection(AUTH_STATE_COLLECTION).doc(state).set({
      uid: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const redirectUri = getRedirectUri(req);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: CALENDAR_SCOPE,
      state
    });
    res.json({ url: `${GOOGLE_AUTH_BASE}?${params.toString()}` });
  })
);

app.get("/oauth/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    res.status(400).send(renderHtml("Authorization failed", String(error)));
    return;
  }
  if (!code || !state) {
    res.status(400).send(renderHtml("Missing data", "OAuth flow returned invalid data."));
    return;
  }
  try {
    const stateDoc = await db.collection(AUTH_STATE_COLLECTION).doc(String(state)).get();
    if (!stateDoc.exists) {
      throw new Error("Invalid or expired session. Please try again.");
    }
    const stateData = stateDoc.data();
    const createdAt = stateData.createdAt?.toDate?.() || new Date();
    if (Date.now() - createdAt.getTime() > STATE_TTL_MS) {
      throw new Error("Session expired. Please try again.");
    }

    const redirectUri = getRedirectUri(req);
    const tokenData = await exchangeCodeForTokens({ code: String(code), redirectUri });

    const tokenRef = db.collection(TOKEN_COLLECTION).doc(stateData.uid);
    const existing = await tokenRef.get();
    const existingRefreshToken = existing.exists ? existing.data()?.refreshToken : null;
    const refreshToken = tokenData.refresh_token || existingRefreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token returned. Revoke access and try again.");
    }

    await tokenRef.set(
      {
        refreshToken,
        accessToken: tokenData.access_token,
        expiryDate: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    await stateDoc.ref.delete();
    res.status(200).send(renderHtml("Google Calendar connected", "You can return to the app.", true));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to finish authentication.";
    res.status(400).send(renderHtml("Authorization failed", message));
  }
});

app.get(
  "/calendar/status",
  requireAuth,
  wrap(async (req, res) => {
    const doc = await db.collection(TOKEN_COLLECTION).doc(req.user.uid).get();
    res.json({ connected: doc.exists });
  })
);

app.get(
  "/calendar/events",
  requireAuth,
  wrap(async (req, res) => {
    const accessToken = await getAccessToken(req.user.uid);
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: req.query.maxResults ? String(req.query.maxResults) : "10",
      timeMin: req.query.timeMin ? String(req.query.timeMin) : new Date().toISOString()
    });
    if (req.query.timeMax) {
      params.set("timeMax", String(req.query.timeMax));
    }
    const data = await callCalendarApi(accessToken, `/calendars/primary/events?${params.toString()}`);
    res.json({ items: data.items || [] });
  })
);

app.post(
  "/calendar/events",
  requireAuth,
  wrap(async (req, res) => {
    const { summary, description, start, end } = req.body || {};
    if (!summary || !start || !end) {
      throw new Error("Missing event summary or time range.");
    }
    const accessToken = await getAccessToken(req.user.uid);
    const payload = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end }
    };
    const data = await callCalendarApi(accessToken, "/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    res.json(data);
  })
);

app.patch(
  "/calendar/events/:eventId",
  requireAuth,
  wrap(async (req, res) => {
    const { eventId } = req.params;
    const { summary, description, start, end } = req.body || {};
    if (!eventId) {
      throw new Error("Missing event id.");
    }
    const accessToken = await getAccessToken(req.user.uid);
    const payload = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end }
    };
    const data = await callCalendarApi(accessToken, `/calendars/primary/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    res.json(data);
  })
);

app.delete(
  "/calendar/events/:eventId",
  requireAuth,
  wrap(async (req, res) => {
    const { eventId } = req.params;
    if (!eventId) {
      throw new Error("Missing event id.");
    }
    const accessToken = await getAccessToken(req.user.uid);
    await callCalendarApi(accessToken, `/calendars/primary/events/${eventId}`, { method: "DELETE" });
    res.json({ ok: true });
  })
);

exports.api = onRequest({ region: "us-central1" }, app);
