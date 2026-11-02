"use client";

import { useFormStatus } from "react-dom";

// A submit button that shows it's working and can't be pressed twice.
export function PendingButton({ children, pendingText, className, style }: { children: React.ReactNode; pendingText: string; className?: string; style?: React.CSSProperties }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending} style={{ ...style, opacity: pending ? 0.7 : 1 }}>
      {pending ? pendingText : children}
    </button>
  );
}
