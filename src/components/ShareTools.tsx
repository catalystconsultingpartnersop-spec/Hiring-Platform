"use client";

import { useEffect, useRef, useState } from "react";

// Copy, download and send buttons for the owner share kit. On phones, "Share"
// sends the picture and the message together (WhatsApp, Messages, email).
export function ShareTools({ message, link, image }: { message: string; link: string; image: string }) {
  const [done, setDone] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);
  const picture = useRef<File | null>(null);
  // The same picture in the tall size WhatsApp status uses (1080 x 1920), with
  // the words kept clear of the bars WhatsApp puts at the top and bottom.
  const statusImage = image.replace(/\.png$/, "-status.png");
  const statusPicture = useRef<File | null>(null);

  useEffect(() => {
    // Load the picture ahead of time, so tapping Share opens the share sheet right away.
    fetch(image)
      .then((r) => r.blob())
      .then((b) => (picture.current = new File([b], "the-candidate-collection.png", { type: "image/png" })))
      .catch(() => {});
    fetch(statusImage)
      .then((r) => r.blob())
      .then((b) => (statusPicture.current = new File([b], "the-candidate-collection-status.png", { type: "image/png" })))
      .catch(() => {});
    // Whether this phone can share a picture (checked once the page is on screen).
    const t = setTimeout(() => {
      try {
        const f = new File([new Blob()], "x.png", { type: "image/png" });
        setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
      } catch {
        setCanShareFiles(false);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [image, statusImage]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setDone(`${what} copied`);
    } catch {
      setDone("Select the text and copy it");
    }
    setTimeout(() => setDone(""), 4000);
  }

  // WhatsApp on iPhone takes a picture or text, never both. The main Share
  // button sends the message with the link, and WhatsApp shows our graphic as
  // the link preview, so both arrive in one tap.
  async function shareMessage() {
    try {
      await navigator.share({ text: message });
    } catch {
      /* they closed the share sheet */
    }
  }

  // The tall picture itself: copy the message first so they can paste it as the caption.
  async function sharePicture() {
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

  // For a WhatsApp status: the tall picture. A status can't carry a tappable
  // link in the picture, so the message is copied to paste as the caption.
  async function shareStatus() {
    navigator.clipboard
      .writeText(message)
      .then(() => setDone("Message copied. Pick WhatsApp, then My status, and paste it as the caption."))
      .catch(() => setDone(""));
    try {
      const file = statusPicture.current ?? new File([await (await fetch(statusImage)).blob()], "the-candidate-collection-status.png", { type: "image/png" });
      await navigator.share({ files: [file] });
    } catch {
      /* they closed the share sheet */
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canShareFiles && (
          <button type="button" className="btn btn-gold" onClick={shareMessage}>
            Share
          </button>
        )}
        {canShareFiles && (
          <button type="button" className="btn btn-ghost" onClick={sharePicture}>
            Share picture only
          </button>
        )}
        {canShareFiles ? (
          <button type="button" className="btn btn-ghost" onClick={shareStatus}>
            For WhatsApp status
          </button>
        ) : (
          <a className="btn btn-ghost" href={statusImage} download="the-candidate-collection-status.png">
            Download for WhatsApp status
          </a>
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
        &ldquo;Share&rdquo; sends the message and link; WhatsApp and Messages show the picture as a preview above it.
      </p>
    </div>
  );
}

export function KitView({ message, link, image }: { message: string; link: string; image: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, alignItems: "start" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="Share picture" style={{ width: "100%", maxWidth: 300, borderRadius: 14, boxShadow: "0 12px 30px rgba(23,33,58,.15)" }} />
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

// The share kit as a shelf: small previews to pick from, then the chosen one
// opens underneath with its message and buttons.
export function KitPicker({ kits }: { kits: { id: string; name: string; tag?: string; about: string; image: string; message: string; link: string }[] }) {
  const [id, setId] = useState(kits[0]?.id ?? "");
  const kit = kits.find((k) => k.id === id) ?? kits[0];
  if (!kit) return null;
  return (
    <div>
      {kits.length > 1 && (
        <>
          <p className="small muted" style={{ margin: "0 0 10px", fontWeight: 600 }}>
            Pick one
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 12, marginBottom: 26 }}>
            {kits.map((k) => {
              const on = k.id === kit.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setId(k.id)}
                  aria-pressed={on}
                  style={{
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    background: "#fff",
                    padding: 8,
                    borderRadius: 14,
                    border: on ? "2.5px solid var(--marigold)" : "2.5px solid var(--line)",
                    boxShadow: on ? "0 8px 20px rgba(23,33,58,.16)" : "none",
                    display: "grid",
                    gap: 6,
                    alignContent: "start",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={k.image} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 8, display: "block" }} />
                  <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, color: "var(--ink)" }}>{k.name}</span>
                  {k.tag && (
                    <span className="tag tag-gold" style={{ justifySelf: "start", fontSize: 11.5 }}>
                      {k.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
      {kits.length > 1 && (
        <p style={{ margin: "0 0 14px" }}>
          <strong style={{ fontSize: 18 }}>{kit.name}</strong> <span className="muted">· {kit.about}</span>
        </p>
      )}
      <KitView key={kit.id} message={kit.message} link={kit.link} image={kit.image} />
    </div>
  );
}
