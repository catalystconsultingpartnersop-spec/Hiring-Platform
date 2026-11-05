"use client";

import { useState } from "react";

// A rep's own booking link, with one-tap ways to send it. The person picks who to send it to in their own app.
export function BookingLink({ link, first, hasHours }: { link: string; first: string; hasHours: boolean }) {
  const [done, setDone] = useState(false);
  const message = `Hi! Here's my link to pick a time for a call. It only takes a minute: ${link}\n\n${first}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };
  return (
    <section className="card" style={{ marginTop: 18, padding: "16px 18px" }} id="booking-link">
      <h2 style={{ fontSize: 19, margin: "0 0 4px" }}>📅 Your booking link</h2>
      <p className="small muted" style={{ margin: "0 0 10px" }}>
        Send it to anyone. They fill in a short form, see only your open times, and the call is booked with you, video link and all.
      </p>
      {!hasHours && (
        <p className="notice notice-gold" style={{ margin: "0 0 10px" }}>
          <strong>Add your call hours first</strong> so people see your times. <a href="/admin/hours">Set your hours</a>
        </p>
      )}
      <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 15, overflowWrap: "anywhere" }}>{link.replace(/^https?:\/\//, "")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-small" onClick={copy}>
          {done ? "Copied ✓" : "Copy link"}
        </button>
        <a className="btn btn-ghost btn-small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a className="btn btn-ghost btn-small" href={`sms:?&body=${encodeURIComponent(message)}`}>
          Text
        </a>
        <a className="btn btn-ghost btn-small" href={`mailto:?subject=${encodeURIComponent("Pick a time to talk")}&body=${encodeURIComponent(message)}`}>
          Email
        </a>
      </div>
    </section>
  );
}
