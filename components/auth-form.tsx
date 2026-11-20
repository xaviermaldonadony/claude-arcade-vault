"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeName, useAuth } from "@/components/auth-provider";

// MOCK sign-in. Any username signs in. Password and email are not checked and not stored.
export function AuthForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    signIn(normalizeName(username));
    router.push("/");
  };

  return (
    <div className="av-auth-wrap">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}
          >
            SYSTEM ACCESS · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            aria-pressed={tab === "in"}
            onClick={() => setTab("in")}
          >
            SIGN IN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            aria-pressed={tab === "up"}
            onClick={() => setTab("up")}
          >
            CREATE ACCOUNT
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="px_kai"
            />
          </div>
          {tab === "up" && (
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="player@vault.gg"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
              placeholder="••••••••"
            />
          </div>

          <button className="btn lg" type="submit" style={{ width: "100%", marginTop: 8 }}>
            {tab === "in" ? "ENTER THE VAULT" : "SIGN UP & PLAY"}
          </button>
        </form>

        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => router.push("/")}
        >
          PLAY AS GUEST
        </button>

        <div className="auth-divider">OR CONTINUE WITH</div>
        <div className="social">
          <button className="btn ghost" type="button">◆  GOOGLE</button>
          <button className="btn ghost" type="button">▣  GITHUB</button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          BY SIGNING IN YOU ACCEPT THE ARCADE HALL TERMS
        </div>
      </div>
    </div>
  );
}
