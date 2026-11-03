"use client";

import { useState } from "react";

export function CopyLink({ link, label = "Copy link" }: { link: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Copy this link:", link);
        }
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
