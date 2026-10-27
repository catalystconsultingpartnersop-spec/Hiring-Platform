"use client";

import { useActionState, useState } from "react";
import { createAccount, LoginState, requestLink, signInWithPassword } from "./actions";
import styles from "./login.module.css";

type Mode = "signin" | "create" | "forgot";

export function LoginForm({ next, startMode = "signin" }: { next: string; startMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(startMode);
  const [signIn, signInAction, signingIn] = useActionState<LoginState, FormData>(signInWithPassword, {});
  const [create, createAction, creating] = useActionState<LoginState, FormData>(createAccount, {});
  const [forgot, forgotAction, sending] = useActionState<LoginState, FormData>(requestLink, {});

  const sent = (mode === "signin" && signIn.sent) || (mode === "create" && create.sent) || (mode === "forgot" && forgot.sent);
  if (sent) {
    return (
      <div className="notice notice-good" role="status">
        <p style={{ margin: 0 }}>
          We emailed a link to <strong>{sent}</strong>.
        </p>
        <p style={{ margin: "8px 0 0" }}>
          {mode === "forgot"
            ? "Click it to sign in and choose a new password."
            : "Your account was set up before passwords. Click the link once to choose a password. After that, you'll sign in right here with no emails."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.switch} role="tablist">
        <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={mode === "create"} onClick={() => setMode("create")}>
          Create an account
        </button>
      </div>

      {mode === "signin" && (
        <form action={signInAction} key={JSON.stringify(signIn)}>
          <input type="hidden" name="next" value={next} />
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" required autoComplete="username" defaultValue={signIn.fields?.email} autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" name="password" autoComplete="current-password" />
          </label>
          {signIn.error && (
            <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
              {signIn.error}
            </p>
          )}
          <button className="btn" type="submit" disabled={signingIn} style={{ marginTop: 20, width: "100%" }}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
          <p className="small" style={{ marginTop: 14, textAlign: "center" }}>
            <button type="button" className="linkish" style={{ marginTop: 0 }} onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          </p>
        </form>
      )}

      {mode === "create" && (
        <form action={createAction} key={JSON.stringify(create)}>
          <input type="hidden" name="next" value={next} />
          <label className="field">
            <span>Your full name</span>
            <input className="input" name="full_name" required autoComplete="name" defaultValue={create.fields?.full_name} autoFocus />
          </label>
          <label className="field">
            <span>Company</span>
            <input className="input" name="company" required autoComplete="organization" defaultValue={create.fields?.company} />
          </label>
          <label className="field">
            <span>Work email</span>
            <input className="input" type="email" name="email" required autoComplete="username" defaultValue={create.fields?.email} />
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input className="input" type="tel" name="phone" autoComplete="tel" defaultValue={create.fields?.phone} />
          </label>
          <label className="field">
            <span>Choose a password (at least 8 characters)</span>
            <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
          </label>
          {create.error && (
            <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
              {create.error}
            </p>
          )}
          <button className="btn btn-gold" type="submit" disabled={creating} style={{ marginTop: 20, width: "100%" }}>
            {creating ? "Creating your account…" : "Create account"}
          </button>
          <p className="small muted" style={{ marginTop: 10, textAlign: "center" }}>
            Free. You only pay a flat fee if you hire someone.
          </p>
        </form>
      )}

      {mode === "forgot" && (
        <form action={forgotAction}>
          <input type="hidden" name="next" value={`/account/setup?pw=1&next=${encodeURIComponent(next || "/candidates")}`} />
          <p className="small muted" style={{ marginTop: 0 }}>
            Enter your email and we&rsquo;ll send a link to sign in and choose a new password.
          </p>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" required autoComplete="username" autoFocus />
          </label>
          {forgot.error && (
            <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
              {forgot.error}
            </p>
          )}
          <button className="btn" type="submit" disabled={sending} style={{ marginTop: 20, width: "100%" }}>
            {sending ? "Sending…" : "Email me a link"}
          </button>
          <p className="small" style={{ marginTop: 14, textAlign: "center" }}>
            <button type="button" className="linkish" style={{ marginTop: 0 }} onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          </p>
        </form>
      )}
    </>
  );
}
