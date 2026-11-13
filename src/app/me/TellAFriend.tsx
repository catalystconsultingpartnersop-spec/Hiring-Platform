"use client";

import { useState } from "react";

// A candidate who felt helped can pass us on to a friend. No reward, just a
// kind word and a link.
export function TellAFriend({ link }: { link: string }) {
  const [done, setDone] = useState(false);
  const message = `I've been working with The Candidate Collection on my job search, and they've been a real help. They sit down with you, figure out what kind of work fits you, and introduce you to employers. Worth a look if you're thinking about your next move: ${link}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {}
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        return;
      }
    }
    copy();
  }
  return (
    <div className="panel">
      <p style={{ fontWeight: 800, margin: "0 0 4px" }}>Know someone looking for their next move?</p>
      <p className="small" style={{ margin: "0 0 12px" }}>
        If we&rsquo;ve been a help to you, pass it on. A friend looking for work, or thinking about a change, can start with the same conversation you did.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-gold btn-small" onClick={share}>
          Share with a friend
        </button>
        <a className="btn btn-ghost btn-small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
          {done ? "Copied ✓" : "Copy message"}
        </button>
      </div>
    </div>
  );
}
