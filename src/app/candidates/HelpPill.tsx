"use client";

import { mark } from "@/components/Seen";
import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CallbackForm } from "../CallbackForm";
import { TellForm } from "./TellMeWhen";
import styles from "./catalog.module.css";

// Always within reach while an owner browses: one small button that opens the
// same call-back form as the front page, with the video call as the other way.
export function HelpPill({ roles, words }: { roles: string[]; words: string }) {
  const [open, setOpen] = useState(false);
  const [way, setWay] = useState<"call" | "text">("call");
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={styles.helpPill}
        onClick={() => {
          setWay("call");
          setOpen(true);
          track("Browse help opened");
          mark("help_opened");
        }}
        aria-haspopup="dialog"
      >
        <span aria-hidden>☎</span> Need help?
      </button>
      {open && (
        <div className={styles.helpBack} onClick={() => setOpen(false)}>
          <div className={styles.helpBox} role="dialog" aria-modal="true" aria-label="Talk to our team" onClick={(ev) => ev.stopPropagation()}>
            <button type="button" className={styles.helpX} onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
            {way === "call" && (
              <>
                <h2>Need help choosing?</h2>
                <p className={styles.helpLede}>We&rsquo;ve met every candidate here. Tell us the position, and we&rsquo;ll call you with who fits.</p>
                <CallbackForm />
                <div className={styles.helpMore}>
                  <p>
                    Don&rsquo;t see who you need?{" "}
                    <button type="button" className={styles.helpBackLink} onClick={() => setWay("text")}>
                      We&rsquo;ll text you when they join.
                    </button>
                  </p>
                  <p>
                    Or <Link href="/meet">pick a time for a video call</Link>.
                  </p>
                </div>
              </>
            )}
            {way === "text" && (
              <>
                <h2>Don&rsquo;t see who you need?</h2>
                <p className={styles.helpLede}>Tell us the role, and we&rsquo;ll text you when they join.</p>
                <TellForm roles={roles} words={words} focus />
                <p className={styles.helpAlt}>
                  <button type="button" className={styles.helpBackLink} onClick={() => setWay("call")}>
                    ← Back
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
