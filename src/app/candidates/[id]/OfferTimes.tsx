"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { offerTimes, OfferState } from "./pathActions";
import styles from "./path.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The next three weeks, without Saturdays.
function dayChoices() {
  const out: { v: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; out.length < 18 && i < 30; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (d.getDay() === 6) continue;
    out.push({ v: ymd(d), label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) });
  }
  return out;
}

// Business-hours times on the half hour.
const TIMES = Array.from({ length: 25 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 ? 30 : 0;
  return { v: `${pad(h)}:${pad(m)}`, label: `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}` };
});

// Starts on the next three weekdays at 10am, 1pm and 4pm.
function suggestions(days: { v: string }[]) {
  const weekdays = days.filter((d) => new Date(`${d.v}T12:00`).getDay() !== 0);
  return ["10:00", "13:00", "16:00"].map((t, i) => ({ day: weekdays[i]?.v ?? "", time: t }));
}

function Slots() {
  const [days] = useState(dayChoices);
  const [starts] = useState(() => suggestions(days));
  return starts.map((s, i) => <Slot key={i} n={i + 1} days={days} start={s} />);
}

function Slot({ n, days, start }: { n: number; days: { v: string; label: string }[]; start: { day: string; time: string } }) {
  const [day, setDay] = useState(start.day);
  const [time, setTime] = useState(start.time);
  return (
    <div className={styles.slot}>
      <span className={styles.slotN}>{n}</span>
      <select className="select" aria-label={`Day ${n}`} value={day} onChange={(e) => setDay(e.target.value)} required={n === 1}>
        {n > 1 && <option value="">No time</option>}
        {days.map((d) => (
          <option key={d.v} value={d.v}>
            {d.label}
          </option>
        ))}
      </select>
      <select className="select" aria-label={`Time ${n}`} value={time} onChange={(e) => setTime(e.target.value)} disabled={!day}>
        {TIMES.map((t) => (
          <option key={t.v} value={t.v}>
            {t.label}
          </option>
        ))}
      </select>
      <input type="hidden" name="slot" value={day ? `${day}T${time}` : ""} />
    </div>
  );
}

export function OfferTimes({
  candidateId,
  kind,
  first,
  phone,
  retimeNote,
}: {
  candidateId: string;
  kind: "call" | "meeting";
  first: string;
  phone: string | null;
  retimeNote?: string | null;
}) {
  const [state, action, pending] = useActionState<OfferState, FormData>(offerTimes.bind(null, candidateId, kind), {});
  const [mode, setMode] = useState<"phone" | "video" | "in_person">(kind === "call" ? "phone" : "in_person");
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const modes: [typeof mode, string][] =
    kind === "call"
      ? [
          ["phone", "Phone call"],
          ["video", "Video call"],
        ]
      : [
          ["in_person", "In person"],
          ["video", "Video call"],
          ["phone", "Phone call"],
        ];

  return (
    <form action={action} className={styles.offer}>
      {/* Filled in the browser, so times are read in the client's own time zone. */}
      <input
        type="hidden"
        name="tz"
        ref={(el) => {
          if (el) el.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }}
      />
      {retimeNote && (
        <p className="notice" style={{ margin: "0 0 14px" }}>
          {first} said: <em>&ldquo;{retimeNote}&rdquo;</em>
        </p>
      )}
      <fieldset className={styles.modes}>
        <legend>How?</legend>
        {modes.map(([v, label]) => (
          <label key={v} className={mode === v ? styles.modeOn : undefined}>
            <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} />
            {label}
          </label>
        ))}
      </fieldset>
      {mode === "phone" && <p className="small muted" style={{ margin: "0 0 12px" }}>You call {first}{phone ? ` at ${phone}` : ""} at the time they pick.</p>}
      {mode === "video" && (
        <label className="field" style={{ marginTop: 0 }}>
          <span>Your video link</span>
          <input className="input" name="place" placeholder="https://meet.google.com/… or Zoom link" required />
        </label>
      )}
      {mode === "in_person" && (
        <label className="field" style={{ marginTop: 0 }}>
          <span>Where</span>
          <input className="input" name="place" placeholder="Your office address" required />
        </label>
      )}
      <div className={styles.slotsHead}>
        <span>Offer up to three times</span>
        <label>
          Length{" "}
          <select className="select" name="minutes" defaultValue={kind === "call" ? "20" : "45"}>
            {[15, 20, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.slots}>
        {/* Days depend on the visitor's own date, so they're filled in the browser. */}
        {inBrowser ? <Slots /> : <div style={{ minHeight: 140 }} />}
      </div>
      <label className="field">
        <span>A short note to {first} (optional)</span>
        <input className="input" name="note" maxLength={500} placeholder={kind === "call" ? "Looking forward to talking!" : "Ask for Sarah at the front desk."} />
      </label>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 12 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending} style={{ marginTop: 16 }}>
        {pending ? "Sending…" : `Send times to ${first}`}
      </button>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        {first} picks one, and you both get a calendar invite.
      </p>
    </form>
  );
}
