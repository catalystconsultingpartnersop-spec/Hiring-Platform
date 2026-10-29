"use client";

import { useActionState, useState } from "react";
import { offerTimes, OfferState } from "./pathActions";
import styles from "./path.module.css";

// Suggests the next three weekdays at 10am, 1pm and 4pm in the client's own time.
function suggestions() {
  const out: string[] = [];
  const d = new Date();
  const hours = [10, 13, 16];
  let i = 0;
  while (out.length < 3 && i < 14) {
    i++;
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const h = hours[out.length];
    const pad = (n: number) => String(n).padStart(2, "0");
    out.push(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(h)}:00`);
  }
  return out;
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
  const [slots] = useState(suggestions);
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
        {slots.map((s, i) => (
          <input key={i} className="input" type="datetime-local" name="slot" defaultValue={s} required={i === 0} />
        ))}
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
