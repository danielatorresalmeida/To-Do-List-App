import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase";

const ensureFirebase = () => {
  if (!auth || !googleProvider || !isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Fill in the Vite env variables.");
  }
};

export const signInWithGoogle = async () => {
  ensureFirebase();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signInWithEmail = async (email: string, password: string) => {
  ensureFirebase();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signUpWithEmail = async (email: string, password: string) => {
  ensureFirebase();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signOut = async () => {
  if (!auth || !isFirebaseConfigured) {
    return;
  }
  await firebaseSignOut(auth);
};

export const getIdToken = async () => {
  ensureFirebase();
  if (!auth?.currentUser) {
    throw new Error("Sign in to continue.");
  }
  return auth.currentUser.getIdToken();
};
