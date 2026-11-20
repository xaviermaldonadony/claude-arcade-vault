"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// MOCK sign-in. Stores only a display name in localStorage. No passwords, no sessions, no server.
// Replace with real auth in a future spec.

export type User = { name: string };

type AuthContextValue = {
  user: User | null;
  signIn: (name: string) => void;
  signOut: () => void;
};

const STORAGE_KEY = "av_user";
const DEFAULT_NAME = "PLAYER1";
const MAX_NAME_LENGTH = 10;

const AuthContext = createContext<AuthContextValue | null>(null);

export function normalizeName(raw: string): string {
  const name = raw.trim().toUpperCase().slice(0, MAX_NAME_LENGTH);
  return name || DEFAULT_NAME;
}

// External store: localStorage. Listeners let same-tab writes and other-tab writes re-render.
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Raw string snapshot: a primitive, so React can compare it cheaply.
function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

// Used during server render and hydration. Always signed out, so markup matches.
function getServerSnapshot(): string | null {
  return null;
}

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw);
    return stored && typeof stored.name === "string" ? { name: stored.name } : null;
  } catch {
    return null; // Corrupt value: treat as signed out.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = useMemo(() => parseUser(raw), [raw]);

  const signIn = (name: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: normalizeName(name) }));
    emit();
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    emit();
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
