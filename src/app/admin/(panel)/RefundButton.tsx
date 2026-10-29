"use client";

import { useState } from "react";
import { refundHire } from "../actions";

// A small two-step refund: click Refund, add a reason, confirm.
export function RefundButton({ hireId, amount, company, back }: { hireId: string; amount: string; company: string; back: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn btn-small btn-danger" onClick={() => setOpen(true)}>
        Refund
      </button>
    );
  return (
    <form
      action={refundHire.bind(null, hireId)}
      onSubmit={(e) => {
        if (!window.confirm(`Refund ${amount} to ${company}? The money goes back to their card. This can't be undone.`)) e.preventDefault();
      }}
      style={{ display: "grid", gap: 6, minWidth: 220 }}
    >
      <input type="hidden" name="back" value={back} />
      <input className="input" name="reason" placeholder="Reason (for your records)" style={{ padding: "6px 8px" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-small btn-danger" type="submit">
          Refund {amount}
        </button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
