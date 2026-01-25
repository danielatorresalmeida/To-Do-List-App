# To-Do-List-App
A simple to-do list app built with React, TypeScript, Firebase, and Vite.

## Google Calendar sync (Firebase Cloud Functions)
1. Create a Google Cloud OAuth client (Web) and enable the Google Calendar API for the project.
2. Set Cloud Functions env vars (either process envs or Firebase config):
   - `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
   - or `firebase functions:config:set google.oauth_client_id="..." google.oauth_client_secret="..."`
3. Add your redirect URI to the OAuth client:
   - `https://<region>-<project-id>.cloudfunctions.net/api/oauth/callback`
   - For local emulators: `http://localhost:5001/<project-id>/us-central1/api/oauth/callback`
4. In your Vite `.env`, set:
   - `VITE_FUNCTIONS_BASE_URL=https://<region>-<project-id>.cloudfunctions.net/api`
