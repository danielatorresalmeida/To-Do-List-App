export type AuthAction = "email-sign-in" | "email-sign-up" | "google-sign-in";
const MAX_SAFE_MESSAGE_LENGTH = 220;

const isErrorWithCode = (error: unknown): error is { code: string; message?: string } => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && typeof (error as { code?: unknown }).code === "string";
};

const toSafeMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "";
};

const isReasonableUserMessage = (message: string) =>
  message.length > 0 && message.length <= MAX_SAFE_MESSAGE_LENGTH;

const getFallbackMessage = (action: AuthAction) => {
  switch (action) {
    case "email-sign-in":
      return "Unable to sign in. Please check your credentials and try again.";
    case "email-sign-up":
      return "Unable to create your account right now. Please try again.";
    case "google-sign-in":
      return "Unable to connect with Google right now. Please try again.";
    default:
      return "Authentication failed. Please try again.";
  }
};

const getGoogleConfigMessage = () =>
  "Google sign-in is misconfigured in Firebase. Enable Google provider and verify OAuth client + authorized domains.";

export const getAuthErrorMessage = (error: unknown, action: AuthAction): string => {
  const fallback = getFallbackMessage(action);
  const rawMessage = toSafeMessage(error);

  if (!isErrorWithCode(error)) {
    return isReasonableUserMessage(rawMessage) ? rawMessage : fallback;
  }

  const { code } = error;
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Popup was blocked by your browser. Allow popups and try Google sign-in again.";
    case "auth/cancelled-popup-request":
      return "A Google sign-in popup is already open.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase OAuth. Add it in Firebase Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "Network error while contacting Firebase. Check your connection and retry.";
    case "auth/invalid-api-key":
    case "auth/app-not-authorized":
      return "Firebase web config is invalid for this app. Verify your Vite Firebase environment variables.";
    case "auth/operation-not-allowed":
      if (action === "google-sign-in") {
        return "Google sign-in is disabled. Enable Google provider in Firebase Authentication.";
      }
      return "Email/password sign-in is disabled in Firebase Authentication.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password to continue.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      if (action === "google-sign-in" && /oauth2|google\.com|invalid_client|unauthorized/i.test(rawMessage)) {
        return getGoogleConfigMessage();
      }
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/account-exists-with-different-credential":
      return "This email is already linked to another sign-in method.";
    default:
      if (action === "google-sign-in" && /oauth2|google\.com|invalid_client|unauthorized/i.test(rawMessage)) {
        return getGoogleConfigMessage();
      }
      if (/PASSWORD_LOGIN_DISABLED/i.test(rawMessage)) {
        return "Email/password sign-in is disabled in Firebase Authentication.";
      }
      return isReasonableUserMessage(rawMessage) ? rawMessage : fallback;
  }
};
