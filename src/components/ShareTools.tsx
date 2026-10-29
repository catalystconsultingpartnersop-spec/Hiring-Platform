"use client";

import { useEffect, useState } from "react";

// Copy, download and send buttons for the owner share kit. On phones, "Share"
// sends the picture and the message together (WhatsApp, Messages, email).
export function ShareTools({ message, link, image }: { message: string; link: string; image: string }) {
  const [done, setDone] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    try {
      const f = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setDone(`${what} copied`);
    } catch {
      setDone("Select the text and copy it");
    }
    setTimeout(() => setDone(""), 2500);
  }

  async function shareAll() {
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], "the-candidate-collection.png", { type: "image/png" });
      await navigator.share({ files: [file], text: message });
    } catch {
      /* they closed the share sheet */
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canShareFiles && (
          <button type="button" className="btn btn-gold" onClick={shareAll}>
            Share picture and message
          </button>
        )}
        <button type="button" className={`btn ${canShareFiles ? "btn-ghost" : "btn-gold"}`} onClick={() => copy(message, "Message")}>
          Copy message
        </button>
        <a className="btn btn-ghost" href={image} download="the-candidate-collection.png">
          Download picture
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => copy(link, "Link")}>
          Copy link
        </button>
        <a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a className="btn btn-ghost" href={`sms:?&body=${encodeURIComponent(message)}`}>
          Text
        </a>
      </div>
      <p className="small" role="status" style={{ minHeight: 20, color: "var(--moss)", margin: 0 }}>
        {done}
      </p>
    </div>
  );
}

export function KitView({ message, link, image }: { message: string; link: string; image: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, alignItems: "start" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="The Candidate Collection: your next great hire is already vetted" style={{ width: "100%", maxWidth: 460, borderRadius: 16, boxShadow: "0 12px 30px rgba(23,33,58,.15)" }} />
      <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
        <div>
          <p className="small muted" style={{ margin: "0 0 6px", fontWeight: 600 }}>
            The message
          </p>
          <p className="panel panel-wash" style={{ whiteSpace: "pre-wrap", margin: 0, overflowWrap: "anywhere" }}>
            {message}
          </p>
        </div>
        <ShareTools message={message} link={link} image={image} />
      </div>
    </div>
  );
}
