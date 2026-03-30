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

## Fixing Google sign-in misconfiguration
If you see "Google sign-in is misconfigured in Firebase", verify these in order:
1. Firebase Authentication:
   - Enable **Google** in `Authentication > Sign-in method`.
2. OAuth consent + OAuth client in Google Cloud:
   - The OAuth client belongs to the same Firebase project.
   - Your OAuth consent screen is configured and published for your test users.
3. Authorized domains in Firebase:
   - Add your app domain in `Authentication > Settings > Authorized domains`.
   - For local dev, ensure `localhost` is present.
4. App Firebase web config:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - Restart the dev server after editing `.env`.
5. If it still fails:
   - Check browser popup blockers.
   - Confirm the browser URL domain exactly matches an authorized domain.

## Enabling Apple sign-in in Firebase
1. In Firebase `Authentication > Sign-in method`, enable **Apple**.
2. In Apple Developer:
   - Create/confirm a Service ID for web sign-in.
   - Configure Sign in with Apple and return URL from Firebase.
   - Create a Sign in with Apple key (Key ID + private key file), and note Team ID.
3. Back in Firebase Apple provider config:
   - Fill Service ID, Team ID, Key ID, and private key.
4. Add your app domain to Firebase authorized domains.
5. Test Apple sign-in in your app.

## Secret-safety guardrails
1. Install local Git hooks once:
   - `npm run hooks:install`
2. Run a full secret scan manually any time:
   - `npm run secrets:scan`
3. Pre-commit automatically scans staged files and blocks commits that contain:
   - Google API keys
   - Google OAuth client secrets/IDs
   - Google OAuth secret assignments
   - Private key blocks

## Responding to Google API key public exposure alerts
If Google Cloud sends a "publicly accessible API key" alert:
1. Decide if the key is expected to be public:
   - Firebase Web API keys are client identifiers, so they are visible in browser apps.
2. Restrict the key in Google Cloud Console (`APIs & Services > Credentials`):
   - Application restrictions: **HTTP referrers (web sites)**
   - Allowed referrers: your production domain(s) and localhost dev URLs only.
   - API restrictions: limit to Firebase/Auth APIs your app uses.
3. Rotate compromised keys:
   - Create a new key with restrictions.
   - Update local `.env` (never commit `.env`).
   - Redeploy.
   - Delete the old key.
4. Verify no sensitive credentials are tracked:
   - `git ls-files .env` should return nothing.
   - `npm run secrets:scan` should pass.
