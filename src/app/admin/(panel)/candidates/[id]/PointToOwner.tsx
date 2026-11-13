"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
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
  const [onPhone, setOnPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  // A tag on this one send's link, so we can tell the rep when it's opened.
  const [token, setToken] = useState(() => Math.random().toString(36).slice(2, 10));
  const sentLink = `${link}${link.includes("?") ? "&" : "?"}s=${token}`;

  const preset = `Hi${name.trim() ? ` ${name.trim()}` : ""}, I thought of you. ${mine ? "I sat down with this candidate myself" : "Our team sat down with this candidate"}, and I think they could be a real fit for you:\n\n${headline}\n\nTheir profile: ${sentLink}\n\nHappy to tell you more about them.\n${repFirst}`;
  // Just the link, with nothing else: for writing your own words anywhere.
  const cleanLink = `https://${link.replace(/^https?:\/\//, "")}`;
  const [did, setDid] = useState<"link" | "msg" | null>(null);
  const copyText = (what: "link" | "msg", text: string) =>
    navigator.clipboard?.writeText(text).then(
      () => {
        setDid(what);
        setTimeout(() => setDid(null), 2500);
      },
      () => null,
    );
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
      // Phones only open Messages / WhatsApp from a tap, so the next screen has a
      // button for it. A computer usually has no texting app: it gets a code to scan.
      setOnPhone(window.matchMedia("(pointer: coarse)").matches);
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" style={{ color: "#fff", background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.45)" }} onClick={() => copyText("link", cleanLink)}>
            {did === "link" ? "Link copied ✓" : "🔗 Copy link"}
          </button>
          <button type="button" className="btn btn-gold" onClick={() => setOpen(true)}>
            Suggest {first} →
          </button>
        </div>
      </section>
    );

  if (state?.ok) {
    const copy = () => navigator.clipboard?.writeText(message).then(() => setCopied(true), () => null);
    const again = () => {
      setState(null);
      setName("");
      setContact("");
      setEdited(null);
      setCopied(false);
      setToken(Math.random().toString(36).slice(2, 10));
    };
    return (
      <section className="panel" style={{ marginTop: 18 }}>
        {channel === "email" ? (
          <p style={{ margin: 0 }}>
            <strong>Sent ✓</strong> <span className="muted">Emailed to {contact} in your name. Their reply goes to your email inbox.</span>
          </p>
        ) : (
          <>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Almost done: send it from your {channel === "whatsapp" ? "WhatsApp" : "phone"}.</strong>{" "}
              <span className="muted">
                {onPhone
                  ? `Tap the button: your ${channel === "whatsapp" ? "WhatsApp" : "Messages app"} opens with it ready. Then tap send there.`
                  : channel === "text"
                    ? "Texts go from your phone. Point your phone's camera at this code and Messages opens with it ready. Tap send."
                    : "Open WhatsApp with it ready, then tap send."}
              </span>
            </p>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {channel === "text" && !onPhone && <SmsCode to={intl} body={message} />}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(onPhone || channel === "whatsapp") && (
                  <a className={`btn btn-gold ${onPhone ? "" : "btn-small"}`} href={hrefFor(channel)} target={channel === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
                    {onPhone ? (channel === "whatsapp" ? "Open WhatsApp with it ready" : "Open Messages with it ready") : "Open WhatsApp"}
                  </a>
                )}
                <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
                  {copied ? "Copied ✓" : "Copy the message"}
                </button>
              </div>
            </div>
          </>
        )}
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          We&rsquo;ll email you when they open the profile. Everyone you suggested is listed below, with a follow-up button.{" "}
          <button type="button" className="btn btn-ghost btn-small" onClick={again}>
            Pass it to someone else
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="panel" style={{ marginTop: 18, borderColor: "var(--marigold)" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>💡 Pass this profile to someone you know</h2>
      <p className="small muted" style={{ margin: "0 0 10px" }}>
        They see the anonymous profile, no name until they sign. Send it from here, or copy it and send it your own way.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "var(--wash)", borderRadius: 12, padding: "10px 12px", margin: "0 0 12px" }}>
        <code style={{ fontSize: 13.5, overflowWrap: "anywhere", flex: "1 1 220px" }}>{cleanLink.replace(/^https:\/\//, "")}</code>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => copyText("link", cleanLink)}>
          {did === "link" ? "Link copied ✓" : "🔗 Copy just the link"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <label className="field" style={{ margin: 0 }}>
          <span>Who&rsquo;s it for?</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yossi" />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Email or phone <span className="muted" style={{ fontWeight: 400 }}>(only to send from here)</span></span>
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
        <textarea className="textarea" rows={10} value={message} onChange={(e) => setEdited(e.target.value)} />
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
        <button type="button" className="btn btn-ghost btn-small" onClick={() => copyText("msg", message)}>
          {did === "msg" ? "Message copied ✓" : "📋 Copy whole message"}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </section>
  );
}

// A code to scan with a phone camera: opens Messages with the number and text filled in.
export function SmsCode({ to, body }: { to: string; body: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`SMSTO:+${to}:${body}`, { margin: 1, width: 400 }).then(setSrc, () => setSrc(""));
  }, [to, body]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Scan with your phone to text it" width={200} height={200} style={{ borderRadius: 8, border: "1px solid var(--line)" }} />;
}
