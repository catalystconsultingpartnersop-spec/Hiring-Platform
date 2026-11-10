"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { saveAgenda, scheduleCall, type RoomState } from "./actions";
import s from "./room.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function days() {
  const now = new Date();
  return Array.from({ length: 21 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { v: ymd(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) };
  });
}
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  const m = i % 2 ? 30 : 0;
  return { v: `${pad(h)}:${pad(m)}`, label: `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}` };
});
const noop = () => () => {};
const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function CallBox({ team, meId }: { team: { id: string; name: string }[]; meId: string | null }) {
  const [open, setOpen] = useState(false);
  const [dayList] = useState(days);
  const [state, action, pending] = useActionState<RoomState, FormData>(scheduleCall, {});
  const tz = useSyncExternalStore(noop, browserTz, () => "");
  if (state.ok) return <p className="small" style={{ margin: "10px 0 0" }}>Scheduled ✓ Everyone invited got an email with the link.</p>;
  if (!open)
    return (
      <button type="button" className={`btn btn-small ${s.darkBtn}`} onClick={() => setOpen(true)}>
        📅 Schedule a team call
      </button>
    );
  return (
    <form action={action} className={s.callForm}>
      <input type="hidden" name="tz" value={tz} />
      <input className="input" name="title" defaultValue="Team call" aria-label="Title" />
      <div className={s.two}>
        <select className="select" name="day" defaultValue={dayList[1].v} aria-label="Day">
          {dayList.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
        <select className="select" name="time" defaultValue="20:30" aria-label="Time">
          {TIMES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <select className="select" name="minutes" defaultValue="30" aria-label="Length">
        <option value="15">15 minutes</option>
        <option value="30">30 minutes</option>
        <option value="45">45 minutes</option>
        <option value="60">1 hour</option>
      </select>
      <label className="small" style={{ display: "grid", gap: 4 }}>
        <span>Agenda (one item per line)</span>
        <textarea className="textarea" name="agenda" rows={4} placeholder={"New candidates this week\nOwners we're talking to\nWho needs help"} />
      </label>
      <fieldset className={s.invites}>
        <legend className="small">Who&rsquo;s invited</legend>
        {team
          .filter((t) => t.id !== meId)
          .map((t) => (
            <label key={t.id}>
              <input type="checkbox" name="invite" value={t.id} defaultChecked /> {t.name.split(" ")[0]}
            </label>
          ))}
      </fieldset>
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      <span style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
          {pending ? "Setting it up…" : "Schedule it"}
        </button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </span>
      <p className="small muted" style={{ margin: 0 }}>Everyone gets an email with the link and the agenda. The call records itself, and the notes after follow the agenda.</p>
    </form>
  );
}

// The agenda on the call card: anyone on the team can change or add to it.
export function AgendaEdit({ callId, agenda }: { callId: number; agenda: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RoomState, FormData>(saveAgenda.bind(null, callId), {});
  if (!open || state.ok)
    return (
      <button type="button" className={s.callCancel} onClick={() => setOpen(true)} style={{ marginTop: 6, color: "#fff", display: "block" }}>
        {state.ok ? "Saved ✓ Change it again" : agenda.length ? "Change or add to the agenda" : "+ Add an agenda"}
      </button>
    );
  return (
    <form action={action} className={s.callForm} style={{ marginTop: 8 }}>
      <textarea className="textarea" name="agenda" rows={5} defaultValue={agenda.join("\n")} placeholder="One item per line" aria-label="Agenda" autoFocus />
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      <span style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save agenda"}
        </button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </span>
    </form>
  );
}
