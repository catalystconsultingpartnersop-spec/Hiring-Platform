"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { alreadyMet, alreadySpoke, setOwnTime, OfferState } from "./pathActions";
import styles from "./path.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function days() {
  const now = new Date();
  return Array.from({ length: 21 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { v: ymd(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) };
  });
}
const TIMES = Array.from({ length: 29 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  const m = i % 2 ? 30 : 0;
  return { v: `${pad(h)}:${pad(m)}`, label: `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}` };
});

const noop = () => () => {};
const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function OwnTime({ candidateId, first, kind }: { candidateId: string; first: string; kind: "call" | "meeting" }) {
  const [state, action, pending] = useActionState<OfferState, FormData>(setOwnTime.bind(null, candidateId), {});
  const [dayList] = useState(days);
  const [mode, setMode] = useState(kind === "call" ? "phone" : "in_person");
  const tz = useSyncExternalStore(noop, browserTz, () => "");
  return (
    <form action={action} className={styles.ownTime}>
      <input type="hidden" name="tz" value={tz} />
      <input type="hidden" name="kind" value={kind} />
      <div className={styles.ownSlot}>
        <select className="select" name="day" aria-label="Day" defaultValue={dayList[1].v}>
          {dayList.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
        <select className="select" name="time" aria-label="Time" defaultValue="10:00">
          {TIMES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.modeRow}>
        {(
          [
            ["in_person", "In person"],
            ["phone", "Phone"],
            ["video", "Video"],
          ] as const
        ).map(([v, l]) => (
          <label key={v} className={styles.modePick}>
            <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} /> {l}
          </label>
        ))}
      </div>
      {mode !== "phone" && (
        <input className="input" name="place" placeholder={mode === "video" ? "Your video link (optional: leave empty and we'll make one)" : "Address (optional)"} style={{ marginTop: 8 }} />
      )}
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      <button className="btn btn-gold btn-small" type="submit" disabled={pending} style={{ marginTop: 10 }}>
        {pending ? "Saving…" : "Save it"}
      </button>
      <p className="small muted" style={{ margin: "8px 0 0" }}>
        We&rsquo;ll send you and {first} a confirmation with calendar buttons.
      </p>
    </form>
  );
}

// "Already further along?" Lets the client tell us what already happened, so the
// steps never hold them back.
export function AlreadyAhead({ candidateId, first, callDone }: { candidateId: string; first: string; callDone: boolean }) {
  const [open, setOpen] = useState<"" | "set">("");
  const [shown, setShown] = useState(false);
  if (!shown)
    return (
      <button type="button" className={styles.moreLink} onClick={() => setShown(true)}>
        {callDone ? "Already met?" : "Already spoke or met?"}
      </button>
    );
  return (
    <div className={styles.ahead}>
      <p className={styles.aheadTitle}>Already further along with {first}? Just tell us:</p>
      <div className={styles.aheadRow}>
        {!callDone && (
          <form action={alreadySpoke.bind(null, candidateId)}>
            <button type="submit" className="btn btn-ghost btn-small">
              ✓ We already spoke
            </button>
          </form>
        )}
        <button type="button" className={`btn btn-small ${open === "set" ? "" : "btn-ghost"}`} onClick={() => setOpen(open === "set" ? "" : "set")}>
          📅 We set a meeting
        </button>
        <form action={alreadyMet.bind(null, candidateId)}>
          <button type="submit" className="btn btn-ghost btn-small">
            ✓ We already met
          </button>
        </form>
      </div>
      {open === "set" && <OwnTime candidateId={candidateId} first={first} kind="meeting" />}
    </div>
  );
}
