"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// A submit button that shows it's working, then "Sent ✓", so a click never feels ignored.
export function SendButton({ label, done = "Sent ✓", className = "btn btn-ghost btn-small" }: { label: string; done?: string; className?: string }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (was.current && !pending) {
      setSent(true);
      const t = setTimeout(() => setSent(false), 6000);
      return () => clearTimeout(t);
    }
    was.current = pending;
  }, [pending]);
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? "Sending…" : sent ? done : label}
    </button>
  );
}
