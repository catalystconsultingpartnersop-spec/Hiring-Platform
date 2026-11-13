"use client";

import { useEffect } from "react";
import { reportProblem } from "./problem";

// Shown if a page breaks. Calm, in our own look, with a way forward, and it
// tells us so we can fix it.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportProblem(window.location.pathname, error.message, error.digest).catch(() => {});
  }, [error]);
  return (
    <div className="wrap narrow" style={{ textAlign: "center", padding: "clamp(64px, 12vw, 140px) 20px" }}>
      <p style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a87a00", margin: "0 0 14px" }}>Our mistake</p>
      <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.035em", lineHeight: 1.05, margin: 0 }}>Something went wrong on our side.</h1>
      <p className="muted" style={{ fontSize: 19, margin: "16px auto 28px", maxWidth: "34ch" }}>
        We&rsquo;ve been told about it. Try again, and if it keeps happening, we&rsquo;re glad to help.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-gold" onClick={() => reset()}>
          Try again
        </button>
        <a className="btn btn-ghost" href="/contact">
          Contact us
        </a>
      </div>
    </div>
  );
}
