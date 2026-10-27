"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { adminLogin, FormState, requestStaffLink } from "../actions";

const ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired or was already used. Ask for a new one below.",
  inactive: "That account has been switched off. Ask Heshy to turn it back on.",
};

function Errors() {
  const e = useSearchParams().get("error");
  if (!e || !ERRORS[e]) return null;
  return (
    <p className="notice notice-bad" role="alert" style={{ marginBottom: 20 }}>
      {ERRORS[e]}
    </p>
  );
}

export default function AdminLogin() {
  const [link, sendLink, sending] = useActionState<FormState, FormData>(requestStaffLink, {});
  const [pw, signIn, checking] = useActionState<FormState, FormData>(adminLogin, {});

  return (
    <div className="wrap narrow" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>Team sign-in</h1>
        <p>For Heshy and the team. We&rsquo;ll email you a link; no password needed.</p>
      </div>
      <Suspense>
        <Errors />
      </Suspense>

      {link.ok ? (
        <p className="notice notice-good" role="status">
          {link.ok}
        </p>
      ) : (
        <form action={sendLink}>
          <label className="field">
            <span>Your email</span>
            <input className="input" type="email" name="email" required autoComplete="email" autoFocus />
          </label>
          {link.error && (
            <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
              {link.error}
            </p>
          )}
          <button className="btn" type="submit" disabled={sending} style={{ marginTop: 20, width: "100%" }}>
            {sending ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}

      <details style={{ marginTop: 36 }}>
        <summary className="small muted" style={{ cursor: "pointer" }}>
          Sign in with the admin password instead
        </summary>
        <form action={signIn} style={{ marginTop: 14 }}>
          <label className="field">
            <span>Admin password</span>
            <input className="input" type="password" name="password" required autoComplete="current-password" />
          </label>
          {pw.error && (
            <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
              {pw.error}
            </p>
          )}
          <button className="btn btn-ghost" type="submit" disabled={checking} style={{ marginTop: 16 }}>
            {checking ? "Checking…" : "Sign in"}
          </button>
        </form>
      </details>
    </div>
  );
}
