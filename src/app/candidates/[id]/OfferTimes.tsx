"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import type { Busy } from "@/lib/ownerSchedule";
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

// What's already taken at a given local day and time (booked first, then offered).
function takenAt(busy: Busy[], day: string, time: string, minutes: number) {
  const s = new Date(`${day}T${time}`).getTime();
  const e = s + minutes * 60e3;
  const hits = busy.filter((b) => Date.parse(b.start) < e && Date.parse(b.end) > s);
  return hits.find((b) => b.status === "booked") ?? hits[0] ?? null;
}

// Starts on the next three weekdays at 10am, 1pm and 4pm, moved off anything already booked.
function suggestions(days: { v: string }[], busy: Busy[], minutes: number) {
  const weekdays = days.filter((d) => new Date(`${d.v}T12:00`).getDay() !== 0);
  return ["10:00", "13:00", "16:00"].map((t, i) => {
    const day = weekdays[i]?.v ?? "";
    if (!day || takenAt(busy, day, t, minutes)?.status !== "booked") return { day, time: t };
    // The nearest free time after it, else before it.
    const at = TIMES.findIndex((x) => x.v === t);
    const free = [...TIMES.slice(at + 1), ...TIMES.slice(0, at).reverse()].find((x) => !takenAt(busy, day, x.v, minutes));
    return { day, time: free?.v ?? t };
  });
}

function Slots({ busy, minutes }: { busy: Busy[]; minutes: number }) {
  const [days] = useState(dayChoices);
  const [starts] = useState(() => suggestions(days, busy, minutes));
  return starts.map((s, i) => <Slot key={i} n={i + 1} days={days} start={s} busy={busy} minutes={minutes} />);
}

function Slot({ n, days, start, busy, minutes }: { n: number; days: { v: string; label: string }[]; start: { day: string; time: string }; busy: Busy[]; minutes: number }) {
  const [day, setDay] = useState(start.day);
  const [time, setTime] = useState(start.time);
  const here = day ? takenAt(busy, day, time, minutes) : null;
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
        {TIMES.map((t) => {
          const b = day ? takenAt(busy, day, t.v, minutes) : null;
          return (
            <option key={t.v} value={t.v} disabled={b?.status === "booked"}>
              {t.label}
              {b ? (b.status === "booked" ? ` · busy (${b.who})` : ` · offered to ${b.who}`) : ""}
            </option>
          );
        })}
      </select>
      <input type="hidden" name="slot" value={day ? `${day}T${time}` : ""} />
      {here && (
        <span className={here.status === "booked" ? styles.slotBusy : styles.slotHeld}>
          {here.status === "booked" ? `You're booked with ${here.who} then` : `Also offered to ${here.who}`}
        </span>
      )}
    </div>
  );
}

export function OfferTimes({
  candidateId,
  kind,
  first,
  phone,
  retimeNote,
  busy = [],
}: {
  busy?: Busy[];
  candidateId: string;
  kind: "call" | "meeting";
  first: string;
  phone: string | null;
  retimeNote?: string | null;
}) {
  const [state, action, pending] = useActionState<OfferState, FormData>(offerTimes.bind(null, candidateId, kind), {});
  const [mode, setMode] = useState<"phone" | "video" | "in_person">(kind === "call" ? "phone" : "in_person");
  const [ownLink, setOwnLink] = useState(false);
  const [minutes, setMinutes] = useState(kind === "call" ? 20 : 45);
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
      {mode === "video" &&
        (ownLink ? (
          <label className="field" style={{ marginTop: 0 }}>
            <span>Your video link</span>
            <input className="input" name="place" placeholder="https://meet.google.com/… or Zoom link" required />
            <button type="button" className={styles.linkBtn} onClick={() => setOwnLink(false)}>
              Never mind, make one for me
            </button>
          </label>
        ) : (
          <div className={styles.meetReady}>
            <span>
              ✓ <strong>We&rsquo;ll make a Google Meet link for you.</strong> {first} gets it with the invite. Just click it at the time.
            </span>
            <button type="button" className={styles.linkBtn} onClick={() => setOwnLink(true)}>
              Use my own link instead
            </button>
          </div>
        ))}
      {mode === "in_person" && (
        <label className="field" style={{ marginTop: 0 }}>
          <span>Where</span>
          <input className="input" name="place" placeholder="Your office address" required />
        </label>
      )}
      {inBrowser && busy.length > 0 && <Schedule busy={busy} />}
      <div className={styles.slotsHead}>
        <span>Offer up to three times</span>
        <label>
          Length{" "}
          <select className="select" name="minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
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
        {inBrowser ? <Slots busy={busy} minutes={minutes} /> : <div style={{ minHeight: 140 }} />}
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

// "Already on your schedule": the client's calls and meetings with their other candidates.
function Schedule({ busy }: { busy: Busy[] }) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const booked = busy.filter((b) => b.status === "booked");
  const offered = busy.filter((b) => b.status === "offered");
  const byWho = [...new Set(offered.map((b) => b.who))];
  return (
    <div className={styles.schedule}>
      <strong>Already on your schedule</strong>
      <ul>
        {booked.map((b, i) => (
          <li key={i}>
            <span className={styles.schedWhen}>{fmt(b.start)}</span> {b.kind === "call" ? "Call" : "Meeting"} with {b.who}
          </li>
        ))}
        {byWho.map((w) => (
          <li key={w} className={styles.schedHeld}>
            Times offered to {w}, waiting for them to pick:{" "}
            {offered
              .filter((b) => b.who === w)
              .map((b) => fmt(b.start))
              .join(" · ")}
          </li>
        ))}
      </ul>
      <p className="small muted" style={{ margin: "6px 0 0" }}>Booked times are marked busy below so you won&rsquo;t double-book.</p>
    </div>
  );
}
