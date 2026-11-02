"use client";

import { startTransition, useActionState, useState } from "react";
import { minutesLabel, TIME_ZONES } from "@/lib/time";
import { callsInBlock } from "@/lib/blocks";
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
const OPTIONS = Array.from({ length: (24 - 6) * 4 + 1 }, (_, i) => 6 * 60 + i * 15); // 6am to midnight, every 15 minutes

type Block = { start: number; end: number };
type Day = { on: boolean; blocks: Block[] };

export function HoursForm({
  windows,
  meetingLink,
  timeZone,
  callMinutes,
}: {
  windows: { weekday: number; start_minute: number; end_minute: number }[];
  meetingLink: string;
  timeZone: string;
  callMinutes: number;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMyHours, {});
  const initial = Object.fromEntries(
    DAYS.map(([d]) => {
      const mine = windows
        .filter((x) => x.weekday === d)
        .sort((a, b) => a.start_minute - b.start_minute)
        .map((w) => ({ start: w.start_minute, end: w.end_minute }));
      return [d, { on: mine.length > 0, blocks: mine.length ? mine : [{ start: 9 * 60, end: 17 * 60 }] }];
    }),
  ) as Record<number, Day>;
  const [days, setDays] = useState(initial);
  const [len, setLen] = useState(callMinutes === 30 ? 30 : 45);
  const callsIn = (b: Block) => callsInBlock(b.start, b.end, len).length;
  const setDay = (d: number, next: Partial<Day>) => setDays((all) => ({ ...all, [d]: { ...all[d], ...next } }));
  const setBlock = (d: number, i: number, next: Partial<Block>) =>
    setDays((all) => ({ ...all, [d]: { ...all[d], blocks: all[d].blocks.map((b, j) => (j === i ? { ...b, ...next } : b)) } }));
  const addBlock = (d: number) =>
    setDays((all) => {
      const last = all[d].blocks[all[d].blocks.length - 1];
      const start = Math.min(last ? last.end + 60 : 9 * 60, 23 * 60);
      return { ...all, [d]: { ...all[d], blocks: [...all[d].blocks, { start, end: Math.min(start + 60, 24 * 60) }] } };
    });
  const removeBlock = (d: number, i: number) =>
    setDays((all) => ({ ...all, [d]: { ...all[d], blocks: all[d].blocks.filter((_, j) => j !== i) } }));

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
        <h2>Your video link (backup)</h2>
        <p className="small muted">
          Booked calls get their own recorded Google Meet room automatically. This link is only used if that&rsquo;s ever
          unavailable. Optional.
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
        <h2>How long are your calls?</h2>
        <p className="small muted">
          A block with room for one call is one call that fills it (for example 5:30 to 6:15 is a 45-minute call, 1:00 to
          1:30 is a 30-minute call). In longer blocks, calls are this long:
        </p>
        <div className={styles.lengths} role="radiogroup" aria-label="Call length">
          {[30, 45].map((m) => (
            <label key={m} className={len === m ? styles.lenOn : ""}>
              <input type="radio" name="call_minutes" value={m} checked={len === m} onChange={() => setLen(m)} />
              {m} minutes
            </label>
          ))}
        </div>
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
            const total = row.blocks.reduce((n, b) => n + callsIn(b), 0);
            return (
              <div key={d} className={`${styles.day} ${row.on ? "" : styles.off}`}>
                <label className={styles.toggle}>
                  <input type="checkbox" name={`on_${d}`} checked={row.on} onChange={(e) => setDay(d, { on: e.target.checked })} />
                  <span>{name}</span>
                </label>
                {row.on ? (
                  <div className={styles.blocks}>
                    <input type="hidden" name={`n_${d}`} value={row.blocks.length} />
                    {row.blocks.map((b, i) => (
                      <div key={i} className={styles.range}>
                        <select
                          className="select"
                          name={`start_${d}_${i}`}
                          value={b.start}
                          onChange={(e) => setBlock(d, i, { start: Number(e.target.value) })}
                          aria-label={`${name} block ${i + 1} start`}
                        >
                          {OPTIONS.slice(0, -1).map((m) => (
                            <option key={m} value={m}>
                              {minutesLabel(m)}
                            </option>
                          ))}
                        </select>
                        <span className="muted">to</span>
                        <select
                          className="select"
                          name={`end_${d}_${i}`}
                          value={b.end}
                          onChange={(e) => setBlock(d, i, { end: Number(e.target.value) })}
                          aria-label={`${name} block ${i + 1} end`}
                        >
                          {OPTIONS.slice(1).map((m) => (
                            <option key={m} value={m}>
                              {m === 24 * 60 ? "midnight" : minutesLabel(m)}
                            </option>
                          ))}
                        </select>
                        {row.blocks.length > 1 && (
                          <button type="button" className={styles.remove} onClick={() => removeBlock(d, i)} aria-label={`Remove ${name} block ${i + 1}`}>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <div className={styles.blockFoot}>
                      {row.blocks.length < 8 && (
                        <button type="button" className={styles.add} onClick={() => addBlock(d)}>
                          + Add another time
                        </button>
                      )}
                      <span className="small muted">
                        {total} {total === 1 ? "call" : "calls"}
                      </span>
                    </div>
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
