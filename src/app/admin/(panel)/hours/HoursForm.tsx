"use client";

import { startTransition, useActionState, useState } from "react";
import { minutesLabel, TIME_ZONES } from "@/lib/time";
import { FormState, saveMyHours } from "../../actions";
import styles from "./hours.module.css";

const DAYS: [number, string][] = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
];
const OPTIONS = Array.from({ length: (22 - 6) * 2 + 1 }, (_, i) => 6 * 60 + i * 30);

export function HoursForm({
  windows,
  meetingLink,
  timeZone,
}: {
  windows: { weekday: number; start_minute: number; end_minute: number }[];
  meetingLink: string;
  timeZone: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMyHours, {});
  const initial = Object.fromEntries(
    DAYS.map(([d]) => {
      const w = windows.find((x) => x.weekday === d);
      return [d, { on: !!w, start: w?.start_minute ?? 9 * 60, end: w?.end_minute ?? 17 * 60 }];
    }),
  ) as Record<number, { on: boolean; start: number; end: number }>;
  const [days, setDays] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        // Submitting this way keeps the form showing what was saved.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <section className={styles.block}>
        <h2>Your video link</h2>
        <p className="small muted">
          Your personal Google Meet or Zoom link. Candidates get it in their booking email.
        </p>
        <input
          className="input"
          name="meeting_link"
          defaultValue={meetingLink}
          placeholder="https://meet.google.com/abc-defg-hij"
          style={{ marginTop: 10 }}
        />
      </section>

      <section className={styles.block}>
        <h2>Your weekly hours</h2>
        <label className={styles.tz}>
          <span>Your time zone</span>
          <select className="select" name="time_zone" defaultValue={timeZone}>
            {TIME_ZONES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.days}>
          {DAYS.map(([d, name]) => {
            const row = days[d];
            return (
              <div key={d} className={`${styles.day} ${row.on ? "" : styles.off}`}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    name={`on_${d}`}
                    checked={row.on}
                    onChange={(e) => setDays({ ...days, [d]: { ...row, on: e.target.checked } })}
                  />
                  <span>{name}</span>
                </label>
                {row.on ? (
                  <div className={styles.range}>
                    <select
                      className="select"
                      name={`start_${d}`}
                      value={row.start}
                      onChange={(e) => setDays({ ...days, [d]: { ...row, start: Number(e.target.value) } })}
                      aria-label={`${name} start`}
                    >
                      {OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {minutesLabel(m)}
                        </option>
                      ))}
                    </select>
                    <span className="muted">to</span>
                    <select
                      className="select"
                      name={`end_${d}`}
                      value={row.end}
                      onChange={(e) => setDays({ ...days, [d]: { ...row, end: Number(e.target.value) } })}
                      aria-label={`${name} end`}
                    >
                      {OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {minutesLabel(m)}
                        </option>
                      ))}
                    </select>
                    <span className="small muted">
                      {Math.max(0, Math.floor((row.end - row.start - 45) / 60) + 1)} calls
                    </span>
                  </div>
                ) : (
                  <span className="small muted">Not available</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.save}>
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save my hours"}
        </button>
        {state.error && (
          <span className="notice notice-bad" role="alert">
            {state.error}
          </span>
        )}
        {state.ok && !pending && (
          <span className="notice notice-good" role="status">
            {state.ok}
          </span>
        )}
      </div>
    </form>
  );
}
