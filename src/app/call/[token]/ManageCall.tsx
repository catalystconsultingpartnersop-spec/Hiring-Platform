"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { TimePicker } from "@/components/TimePicker";
import { cancelMyCall, rescheduleMyCall } from "./actions";

const noop = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function ManageCall({
  token,
  status,
  start,
  first,
  rep,
  link,
  times,
  past,
}: {
  token: string;
  status: string;
  start: string;
  first: string;
  rep: string;
  link: string | null;
  times: string[];
  past: boolean;
}) {
  const tz = useSyncExternalStore(noop, browserZone, () => "America/New_York");
  const [mode, setMode] = useState<"view" | "move">("view");
  const [cancelled, setCancelled] = useState(status === "cancelled");
  const [moved, setMoved] = useState<{ when: string; manage: string } | null>(null);
  const [pending, startT] = useTransition();
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(start));

  const contact = (
    <p className="apply-contact">
      Questions? <a href="/contact?kind=work">Send us a note</a>.
    </p>
  );

  if (moved) {
    return (
      <div className="apply-card">
        <p className="apply-step">All set</p>
        <h2>Your call is now {moved.when}.</h2>
        <p>We emailed you the new details. The old time is cancelled.</p>
        {contact}
      </div>
    );
  }

  if (mode === "move" || cancelled) {
    return (
      <div className="apply-card">
        <p className="apply-step">{cancelled ? "Your call is cancelled" : "Pick a new time"}</p>
        <h2>{cancelled ? `No problem, ${first}. Want to pick a new time?` : "When works better?"}</h2>
        {times.length ? (
          <TimePicker
            times={times}
            bookLabel={cancelled ? "Book" : "Move to"}
            onBook={async (iso, zone) => {
              const r = await rescheduleMyCall(token, iso, zone);
              if (r.ok && r.when && r.manage) setMoved({ when: r.when, manage: r.manage });
              return r;
            }}
          />
        ) : (
          <p className="notice">No open times right now. Text or call us and we&rsquo;ll find one.</p>
        )}
        {!cancelled && (
          <button type="button" className="linkish" onClick={() => setMode("view")}>
            Keep my current time
          </button>
        )}
        {contact}
      </div>
    );
  }

  return (
    <div className="apply-card">
      <p className="apply-step">{status === "done" ? "Done" : past ? "This call has passed" : "Your career call"}</p>
      <h2>{when}</h2>
      <p>
        45 minutes by video with {rep}. {past ? "" : "We're looking forward to it."}
      </p>
      {!past && status === "booked" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          {link && (
            <a className="btn btn-gold" href={link} target="_blank" rel="noopener noreferrer">
              Join the video call
            </a>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setMode("move")}>
            Pick a different time
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm("Cancel this call?")) return;
              startT(async () => {
                const r = await cancelMyCall(token);
                if (r.ok) setCancelled(true);
              });
            }}
          >
            {pending ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      )}
      {contact}
    </div>
  );
}
