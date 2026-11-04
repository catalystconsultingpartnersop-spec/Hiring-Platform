"use client";

import { useState, useTransition } from "react";
import { pointCandidate } from "@/app/admin/actions";

type Channel = "whatsapp" | "text" | "email";

// "Know someone who'd want to meet them?" A ready, personal message to a business owner.
export function PointToOwner({ candidateId, headline, link, repFirst, mine }: { candidateId: string; headline: string; link: string; repFirst: string; mine: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [edited, setEdited] = useState<string | null>(null);
  const [state, setState] = useState<{ ok?: boolean; error?: string; already?: string } | null>(null);
  const [pending, start] = useTransition();

  const preset = `Hi${name.trim() ? ` ${name.trim()}` : ""}, ${mine ? "I've been working with someone" : "I came across someone"} I think could be a great fit for your team:\n${headline}\n\nTake a look: ${link}\n\nLooking is free, and you only pay if you hire. Thought of you.\n${repFirst}`;
  const message = edited ?? preset;
  const isEmail = contact.includes("@");
  const digits = contact.replace(/\D/g, "");
  const intl = digits.length === 10 ? `1${digits}` : digits;
  const href =
    channel === "whatsapp"
      ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
      : channel === "text"
        ? `sms:+${intl}?&body=${encodeURIComponent(message)}`
        : "";

  const send = (force = false) =>
    start(async () => {
      const r = await pointCandidate(candidateId, { name, contact, channel, message, force });
      setState(r);
      if (r.ok && href) window.location.href = href;
    });

  if (!open)
    return (
      <section className="panel" style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span>
          <strong>💡 Know a business owner who&rsquo;d want to meet them?</strong>{" "}
          <span className="small muted">Send them this profile in a personal message.</span>
        </span>
        <button type="button" className="btn btn-gold btn-small" onClick={() => setOpen(true)}>
          Send to an owner
        </button>
      </section>
    );

  if (state?.ok)
    return (
      <section className="panel" style={{ marginTop: 18 }}>
        <strong>Sent ✓</strong>{" "}
        <span className="small muted">
          {channel === "email" ? `Emailed to ${contact}. Replies come to you.` : `Your ${channel === "whatsapp" ? "WhatsApp" : "messages"} opened with it ready. Tap send there.`} That&rsquo;s it, nothing else to do.
        </span>{" "}
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => {
            setState(null);
            setName("");
            setContact("");
            setEdited(null);
          }}
        >
          Send to someone else
        </button>
      </section>
    );

  return (
    <section className="panel" style={{ marginTop: 18, borderColor: "var(--marigold)" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>💡 Send this profile to a business owner</h2>
      <p className="small muted" style={{ margin: "0 0 10px" }}>
        They see the anonymous profile, the same one owners see. One message, then you&rsquo;re done.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <label className="field" style={{ margin: 0 }}>
          <span>Their first name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yossi" />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Email or phone</span>
          <input
            className="input"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              if (e.target.value.includes("@")) setChannel("email");
              else if (channel === "email" && /\d{3}/.test(e.target.value)) setChannel("whatsapp");
            }}
            placeholder="(917) 555-0123 or name@business.com"
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 6px" }}>
        {(
          [
            ["whatsapp", "WhatsApp"],
            ["text", "Text"],
            ["email", "Email"],
          ] as [Channel, string][]
        ).map(([c, l]) => (
          <button key={c} type="button" className={`btn btn-small ${channel === c ? "" : "btn-ghost"}`} onClick={() => setChannel(c)} disabled={c === "email" ? !isEmail && !!contact : !!contact && isEmail}>
            {l}
          </button>
        ))}
      </div>
      <label className="field" style={{ marginTop: 6 }}>
        <span>Message (ready to go, change anything)</span>
        <textarea className="textarea" rows={8} value={message} onChange={(e) => setEdited(e.target.value)} />
      </label>
      {state?.error && <p className="notice notice-bad small">{state.error}</p>}
      {state?.already && (
        <p className="notice notice-gold small">
          {state.already}{" "}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => send(true)}>
            Send anyway
          </button>
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        <button type="button" className="btn btn-gold btn-small" disabled={pending || !contact.trim()} onClick={() => send()}>
          {pending ? "Sending…" : channel === "email" ? "Send email" : channel === "whatsapp" ? "Open in WhatsApp" : "Open in Messages"}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </section>
  );
}
