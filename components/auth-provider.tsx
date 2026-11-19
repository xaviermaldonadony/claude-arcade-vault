"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  // First render is always signed out so server and client markup match.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (stored && typeof stored.name === "string") {
        setUser({ name: stored.name });
      }
    } catch {
      // Corrupt value: treat as signed out.
    }
  }, []);

  const signIn = (name: string) => {
    const next = { name: normalizeName(name) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
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
