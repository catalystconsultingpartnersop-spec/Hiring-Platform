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
  const [way, setWay] = useState<"menu" | "call" | "text">("menu");
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
          setWay("menu");
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
            {way === "menu" && (
              <>
                <h2>How can we help?</h2>
                <p className={styles.helpLede}>We&rsquo;ve met every candidate here.</p>
                <div className={styles.helpWays}>
                  <button type="button" onClick={() => setWay("call")}>
                    <b>Help me choose</b>
                    <span>Tell us the position, and we&rsquo;ll call you with who fits.</span>
                  </button>
                  <button type="button" onClick={() => setWay("text")}>
                    <b>Don&rsquo;t see who I need</b>
                    <span>Tell us the role, and we&rsquo;ll text you when they join.</span>
                  </button>
                  <Link href="/meet">
                    <b>Meet the team</b>
                    <span>Pick a time for a video call.</span>
                  </Link>
                </div>
                <p className={styles.helpAlt}>
                  Something else? <Link href="/contact">Send us a message</Link>
                </p>
              </>
            )}
            {way === "call" && (
              <>
                <h2>Need help choosing?</h2>
                <p className={styles.helpLede}>We&rsquo;ve met every candidate here. Tell us the position, and we&rsquo;ll call you with who fits.</p>
                <CallbackForm />
              </>
            )}
            {way === "text" && (
              <>
                <h2>Don&rsquo;t see who you need?</h2>
                <p className={styles.helpLede}>Tell us the role, and we&rsquo;ll text you when they join.</p>
                <TellForm roles={roles} words={words} focus />
              </>
            )}
            {way !== "menu" && (
              <p className={styles.helpAlt}>
                <button type="button" className={styles.helpBackLink} onClick={() => setWay("menu")}>
                  ← Other ways we can help
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
