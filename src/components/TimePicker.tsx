"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

const noop = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Pick a day, then a time. Times are shown in the visitor's own time zone.
export function TimePicker({
  times,
  onBook,
  bookLabel = "Book this time",
}: {
  times: string[];
  onBook: (iso: string, timeZone: string) => Promise<{ ok?: boolean; error?: string }>;
  bookLabel?: string;
}) {
  // The visitor's zone is only known in the browser; render times once it is.
  const tz = useSyncExternalStore(noop, browserZone, () => "");
  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!tz) return [];
    for (const t of times) {
      const key = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [times, tz]);

  const [chosenDay, setDay] = useState("");
  const day = chosenDay || days[0]?.[0] || "";
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!tz) return <p className="small muted">Loading open times…</p>;
  if (!days.length) return null;
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const zoneName =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? tz;
  const todays = days.find(([k]) => k === day)?.[1] ?? [];

  return (
    <div className="time-picker">
      <div className="tp-days" role="tablist" aria-label="Choose a day">
        {days.map(([k, list]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === day}
            className={k === day ? "tp-day on" : "tp-day"}
            onClick={() => {
              setDay(k);
              setPicked(null);
            }}
          >
            {dayLabel(list[0])}
          </button>
        ))}
      </div>
      <div className="tp-times" role="group" aria-label="Choose a time">
        {todays.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={picked === t}
            className={picked === t ? "tp-time on" : "tp-time"}
            onClick={() => setPicked(t)}
          >
            {timeLabel(t)}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Times are in your time zone ({zoneName}). Each call is 45 minutes.
      </p>
      {error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn btn-gold"
        disabled={!picked || pending}
        style={{ marginTop: 16 }}
        onClick={() =>
          picked &&
          start(async () => {
            setError("");
            const r = await onBook(picked, tz);
            if (!r.ok) setError(r.error ?? "That didn't work. Try another time.");
          })
        }
      >
        {pending ? "Booking…" : picked ? `${bookLabel}: ${dayLabel(picked)}, ${timeLabel(picked)}` : "Pick a time above"}
      </button>
    </div>
  );
}
