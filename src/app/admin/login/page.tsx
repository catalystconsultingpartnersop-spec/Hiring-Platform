"use client";

import { startTransition, Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormState, requestStaffLink, staffLogin } from "../actions";

const ERRORS: Record<string, string> = {
  expired: "That link has expired or was already used. Sign in below, or ask for a new link.",
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

export default function TeamLogin() {
  const [pw, signIn, checking] = useActionState<FormState, FormData>(staffLogin, {});
  const [link, sendLink, sending] = useActionState<FormState, FormData>(requestStaffLink, {});
  const [showLink, setShowLink] = useState(false);

  return (
    <div className="wrap narrow" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>Team sign-in</h1>
        <p>For Heshy and the team. Business owners sign in from the main site.</p>
      </div>
      <Suspense>
        <Errors />
      </Suspense>

      <form
        onSubmit={(e) => {
          // Keeps the email filled in if the password was wrong.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => signIn(fd));
        }}
      >
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" name="email" required autoComplete="username" autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" name="password" required autoComplete="current-password" />
        </label>
        {pw.error && (
          <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
            {pw.error}
          </p>
        )}
        <button className="btn" type="submit" disabled={checking} style={{ marginTop: 20, width: "100%" }}>
          {checking ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="small muted" style={{ marginTop: 12 }}>
        You&rsquo;ll stay signed in on this device for 30 days.
      </p>

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        {!showLink ? (
          <button type="button" className="linkish" style={{ marginTop: 0 }} onClick={() => setShowLink(true)}>
            First time, or forgot your password? Email me a link
          </button>
        ) : link.ok ? (
          <p className="notice notice-good" role="status">
            {link.ok}
          </p>
        ) : (
          <form action={sendLink}>
            <label className="field">
              <span>Your email</span>
              <input className="input" type="email" name="email" required autoComplete="email" />
            </label>
            {link.error && (
              <p className="notice notice-bad" role="alert" style={{ marginTop: 16 }}>
                {link.error}
              </p>
            )}
            <button className="btn btn-ghost" type="submit" disabled={sending} style={{ marginTop: 14 }}>
              {sending ? "Sending…" : "Email me a sign-in link"}
            </button>
            <p className="small muted" style={{ marginTop: 8 }}>
              After you sign in with the link, you&rsquo;ll set a password.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
