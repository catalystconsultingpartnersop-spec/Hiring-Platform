"use client";

import { useState, useTransition } from "react";
import { pointCandidate } from "@/app/admin/actions";

type Channel = "whatsapp" | "text" | "email";

// "Know someone who'd want to meet them?" A ready, personal message to a business owner.
export function PointToOwner({ candidateId, headline, link, repFirst, mine, first, gold = false }: { candidateId: string; headline: string; link: string; repFirst: string; mine: boolean; first: string; gold?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [edited, setEdited] = useState<string | null>(null);
  const [state, setState] = useState<{ ok?: boolean; error?: string; already?: string } | null>(null);
  const [pending, start] = useTransition();
  // A tag on this one send's link, so we can tell the rep when it's opened.
  const [token, setToken] = useState(() => Math.random().toString(36).slice(2, 10));
  const sentLink = `${link}${link.includes("?") ? "&" : "?"}s=${token}`;

  const preset = `Hi${name.trim() ? ` ${name.trim()}` : ""}, ${mine ? "someone I've been working with came to mind for you" : "someone came to mind for you"}:\n${headline}\n\nTake a look: ${sentLink}\n\nLooking is free, and you only pay if you hire.\n${repFirst}`;
  const message = edited ?? preset;
  const isEmail = contact.includes("@");
  const digits = contact.replace(/\D/g, "");
  const intl = digits.length === 10 ? `1${digits}` : digits;
  const hrefFor = (ch: Channel) =>
    ch === "whatsapp" ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}` : ch === "text" ? `sms:+${intl}?&body=${encodeURIComponent(message)}` : "";

  // Never a greyed-out button: if something's missing, say what.
  const send = (ch: Channel, force = false) => {
    setChannel(ch);
    if (!contact.trim()) return setState({ error: ch === "email" ? "Add their email first." : "Add their phone number first." });
    if (ch === "email" && !isEmail) return setState({ error: "That's a phone number. Use WhatsApp or Text, or type their email." });
    if (ch !== "email" && isEmail) return setState({ error: "That's an email address. Use Email, or type their phone number." });
    start(async () => {
      const r = await pointCandidate(candidateId, { name, contact, channel: ch, message, force, token });
      setState(r);
      const href = hrefFor(ch);
      if (r.ok && href) window.location.href = href;
    });
  };

  if (!open)
    return (
      <section
        style={{
          marginTop: 18,
          background: "var(--ink)",
          color: "#fff",
          borderRadius: "var(--radius-lg)",
          padding: "18px 22px",
          display: "flex",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
          <span aria-hidden="true" style={{ fontSize: 30, lineHeight: 1 }}>
            🤝
          </span>
          <div>
            {gold && (
              <div style={{ display: "inline-block", background: "var(--marigold)", color: "var(--ink)", fontWeight: 800, fontSize: 12.5, borderRadius: 999, padding: "2px 10px", marginBottom: 6 }}>
                ⭐ Gold standard: a great one to suggest
              </div>
            )}
            <div style={{ fontWeight: 800, fontSize: 19 }}>{repFirst ? `${repFirst}, know` : "Know"} someone who&rsquo;d want to meet {first}?</div>
            <div style={{ fontSize: 14.5, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>
              A business owner, a friend who&rsquo;s hiring. One message, 30 seconds. They see the anonymous profile.
            </div>
          </div>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setOpen(true)}>
          Suggest {first} →
        </button>
      </section>
    );

  if (state?.ok)
    return (
      <section className="panel" style={{ marginTop: 18 }}>
        <strong>Passed along ✓</strong>{" "}
        <span className="small muted">
          {channel === "email"
            ? `Emailed to ${contact} from the site, in your name. Their reply goes to your email inbox.`
            : `Your ${channel === "whatsapp" ? "WhatsApp" : "Messages app"} opened with it ready. Tap send there, and the conversation stays in your ${channel === "whatsapp" ? "WhatsApp" : "phone"}.`}{" "}
          We&rsquo;ll email you when they open the profile. Everyone you suggested is listed below, with a follow-up button.
        </span>{" "}
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => {
            setState(null);
            setName("");
            setContact("");
            setEdited(null);
            setToken(Math.random().toString(36).slice(2, 10));
          }}
        >
          Pass it to someone else
        </button>
      </section>
    );

  return (
    <section className="panel" style={{ marginTop: 18, borderColor: "var(--marigold)" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>💡 Pass this profile to someone you know</h2>
      <p className="small muted" style={{ margin: "0 0 10px" }}>
        They see the anonymous profile, no name until they sign. One message, then you&rsquo;re done.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <label className="field" style={{ margin: 0 }}>
          <span>Who&rsquo;s it for?</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yossi" />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Email or phone</span>
          <input
            className="input"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              setState(null);
            }}
            placeholder="(917) 555-0123 or name@business.com"
          />
        </label>
      </div>
      <label className="field" style={{ marginTop: 6 }}>
        <span>Message (ready to go, change anything)</span>
        <textarea className="textarea" rows={8} value={message} onChange={(e) => setEdited(e.target.value)} />
      </label>
      {state?.error && <p className="notice notice-bad small">{state.error}</p>}
      {state?.already && (
        <p className="notice notice-gold small">
          {state.already}{" "}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => send(channel, true)}>
            Send anyway
          </button>
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        {(
          [
            ["whatsapp", "Send on WhatsApp"],
            ["text", "Send a text"],
            ["email", "Send by email"],
          ] as [Channel, string][]
        ).map(([ch, l]) => (
          <button key={ch} type="button" className={`btn btn-small ${(isEmail ? ch === "email" : ch !== "email") ? "btn-gold" : "btn-ghost"}`} onClick={() => !pending && send(ch)}>
            {pending && channel === ch ? "Sending…" : l}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </section>
  );
}
