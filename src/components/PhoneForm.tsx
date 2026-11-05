"use client";

import { useActionState } from "react";
import { savePhone, type FormState } from "@/app/admin/actions";

// A rep's mobile number: on My hours (their own) and on Heshy's view of a rep.
export function PhoneForm({ staffId, phone, self }: { staffId: string; phone: string | null; self: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePhone.bind(null, staffId), {});
  return (
    <form action={action} id="phone" className="panel" style={{ scrollMarginTop: 16, marginBottom: 18 }}>
      <label htmlFor="phone-input" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
        {self ? "Your mobile number" : "Mobile number"}
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input id="phone-input" className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={phone ?? ""} placeholder="(917) 555-0123" style={{ maxWidth: 260 }} />
        <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      {state.ok && <p className="small" style={{ color: "var(--moss)", margin: "6px 0 0" }}>{state.ok} ✓</p>}
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {self ? "So we can text you about bookings and your candidates. Only our team sees it." : "Used for texts to the rep later on. Only the team sees it."}
      </p>
    </form>
  );
}
