"use client";

import { useFormStatus } from "react-dom";

export function HireSubmit({ label, ghost, name, value }: { label: string; ghost?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`btn ${ghost ? "btn-ghost" : "btn-gold"}`}
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      style={ghost ? undefined : { minWidth: 240 }}
    >
      {pending ? "Processing…" : label}
    </button>
  );
}
