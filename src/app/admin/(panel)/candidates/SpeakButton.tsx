"use client";

import { useRef, useState, useSyncExternalStore } from "react";

type Rec = { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
type RecCtor = new () => Rec;
const recCtor = () => (typeof window === "undefined" ? null : ((window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: RecCtor }).webkitSpeechRecognition ?? null));

// Speak instead of typing. Words show up in the box as you talk.
export function SpeakButton({ onText }: { onText: (t: string) => void }) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!recCtor(),
    () => false,
  );
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState("");
  const rec = useRef<Rec | null>(null);
  if (!supported) return <span className="small muted">Tip: tap the microphone on your phone&rsquo;s keyboard to speak.</span>;
  const stop = () => {
    rec.current?.stop();
    setOn(false);
  };
  const start = () => {
    const R = recCtor();
    if (!R) return;
    const r = new R();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
    };
    r.onend = () => setOn(false);
    r.onerror = (e) => {
      setOn(false);
      setMsg(e.error === "not-allowed" ? "Allow the microphone for this site, then try again." : "Didn't catch that. Try again.");
    };
    rec.current = r;
    setMsg("");
    r.start();
    setOn(true);
  };
  return (
    <>
      <button type="button" className={`btn btn-small ${on ? "btn-danger" : "btn-ghost"}`} onClick={on ? stop : start}>
        {on ? "■ Stop" : "🎤 Speak"}
      </button>
      {on && <span className="small" style={{ color: "var(--rust)" }}>Listening… talk naturally, then tap Stop.</span>}
      {msg && <span className="small muted">{msg}</span>}
    </>
  );
}
