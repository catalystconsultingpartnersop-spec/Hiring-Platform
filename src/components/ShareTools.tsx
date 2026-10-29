"use client";

import { useEffect, useRef, useState } from "react";

// Copy, download and send buttons for the owner share kit. On phones, "Share"
// sends the picture and the message together (WhatsApp, Messages, email).
export function ShareTools({ message, link, image }: { message: string; link: string; image: string }) {
  const [done, setDone] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);
  const picture = useRef<File | null>(null);

  useEffect(() => {
    // Load the picture ahead of time, so tapping Share opens the share sheet right away.
    fetch(image)
      .then((r) => r.blob())
      .then((b) => (picture.current = new File([b], "the-candidate-collection.png", { type: "image/png" })))
      .catch(() => {});
    try {
      const f = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
    } catch {
      setCanShareFiles(false);
    }
  }, [image]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setDone(`${what} copied`);
    } catch {
      setDone("Select the text and copy it");
    }
    setTimeout(() => setDone(""), 4000);
  }

  // WhatsApp drops the picture when it gets a picture and text together, so we
  // copy the message first and share just the picture; they paste the message
  // as the caption. (Pasting the link alone also shows the picture as a preview.)
  async function shareAll() {
    // Start both right away, inside the tap: phones only allow sharing straight after a tap.
    navigator.clipboard
      .writeText(message)
      .then(() => setDone("Message copied. In WhatsApp, tap the caption box and paste it."))
      .catch(() => setDone(""));
    try {
      const file = picture.current ?? new File([await (await fetch(image)).blob()], "the-candidate-collection.png", { type: "image/png" });
      await navigator.share({ files: [file] });
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
      <p className="small muted" style={{ margin: 0 }}>
        Tip: just pasting the link also shows the picture as a preview in WhatsApp and Messages.
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
