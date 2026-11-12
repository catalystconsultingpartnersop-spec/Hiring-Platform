"use client";

import { useState, useTransition } from "react";
import { TimePicker } from "@/components/TimePicker";
import type { MeetRequest } from "@/lib/meetUs";
import { askForCall, bookMeetUs } from "./actions";
import s from "./meet.module.css";

const WHEN = ["As soon as possible", "Within a month", "Just exploring"];

export function MeetFlow({ times, names, role = "", town = "" }: { times: string[]; names: string; role?: string; town?: string }) {
  const [r, setR] = useState<MeetRequest>({ name: "", business: "", email: "", phone: "", role, town, when: "", notes: "", phoneCall: false });
  const [done, setDone] = useState<null | { when?: string; link?: string; phoneCall?: boolean; asked?: boolean }>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof MeetRequest) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setR({ ...r, [k]: ev.target.value });
  const ready = r.role.trim() && r.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) && (!r.phoneCall || r.phone.replace(/\D/g, "").length >= 10);

  if (done)
    return (
      <div className={s.done}>
        <p className={s.check}>✓</p>
        {done.asked ? (
          <>
            <h2>Thanks, {r.name.split(" ")[0]}.</h2>
            <p>We&rsquo;ll reach out to set a time that works for you.</p>
          </>
        ) : (
          <>
            <h2>You&rsquo;re booked.</h2>
            <p>
              {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(done.when!))}, with {names}.
              {done.phoneCall ? ` We'll call you at ${r.phone}.` : " The video link is in your email, with a calendar invite."}
            </p>
            {done.link && !done.phoneCall && (
              <a className="btn btn-gold" href={done.link} target="_blank" rel="noreferrer">
                Save the video link
              </a>
            )}
          </>
        )}
      </div>
    );

  return (
    <div className={s.flow}>
      <section className={s.step}>
        <h2>
          <span>1</span> What are you hiring for?
        </h2>
        <div className={s.grid2}>
          <label className="field">
            <span>The role</span>
            <input className="input" value={r.role} onChange={set("role")} placeholder="e.g. Office manager, bookkeeper, sales" />
          </label>
          <label className="field">
            <span>Where (optional)</span>
            <input className="input" value={r.town} onChange={set("town")} placeholder="e.g. Brooklyn, NY, or remote" />
          </label>
        </div>
        <div className={s.chips}>
          {WHEN.map((w) => (
            <button key={w} type="button" className={r.when === w ? "chip chip-on" : "chip"} onClick={() => setR({ ...r, when: r.when === w ? "" : w })}>
              {w}
            </button>
          ))}
        </div>
      </section>

      <section className={s.step}>
        <h2>
          <span>2</span> About you
        </h2>
        <div className={s.grid2}>
          <label className="field">
            <span>Your name</span>
            <input className="input" value={r.name} onChange={set("name")} autoComplete="name" />
          </label>
          <label className="field">
            <span>Business (optional)</span>
            <input className="input" value={r.business} onChange={set("business")} autoComplete="organization" />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" value={r.email} onChange={set("email")} autoComplete="email" />
          </label>
          <label className="field">
            <span>Phone {r.phoneCall ? "" : "(optional)"}</span>
            <input className="input" type="tel" value={r.phone} onChange={set("phone")} autoComplete="tel" />
          </label>
        </div>
        <label className={s.tick}>
          <input type="checkbox" checked={r.phoneCall} onChange={(ev) => setR({ ...r, phoneCall: ev.target.checked })} /> I&rsquo;d rather talk by phone than video
        </label>
      </section>

      <section className={s.step}>
        <h2>
          <span>3</span> Pick a time
        </h2>
        {!ready ? (
          <p className="muted small">Fill in the role, your name and email above, and the open times show here.</p>
        ) : times.length ? (
          <TimePicker
            times={times}
            bookLabel="Book my call"
            lengthNote="The call is 30 minutes."
            onBook={async (iso, tz) => {
              const res = await bookMeetUs(iso, tz, r);
              if ("ok" in res && res.ok) setDone({ when: res.when, link: res.link, phoneCall: res.phoneCall });
              return res;
            }}
          />
        ) : (
          <div>
            <p className="small">No open times this week. Leave your details and we&rsquo;ll reach out to set one up.</p>
            {err && <p className="notice notice-bad small">{err}</p>}
            <button
              type="button"
              className="btn btn-gold"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await askForCall(r);
                  if ("ok" in res) setDone({ asked: true });
                  else setErr(res.error);
                })
              }
            >
              {pending ? "Sending…" : "Ask for a call"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
