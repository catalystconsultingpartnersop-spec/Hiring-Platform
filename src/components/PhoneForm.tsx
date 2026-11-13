"use client";

import { useActionState } from "react";
import { savePhone, type FormState } from "@/app/admin/actions";

// A rep's mobile number: on My hours (their own) and on Heshy's view of a rep.
export function PhoneForm({ staffId, phone, self, textOk }: { staffId: string; phone: string | null; self: boolean; textOk?: boolean }) {
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
      {self && (
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "12px 0 0", cursor: "pointer" }}>
          <input type="checkbox" name="text_ok" value="yes" defaultChecked={textOk} style={{ marginTop: 3, width: 18, height: 18, flex: "none" }} />
          <span style={{ fontSize: 14.5 }}>
            <b>Text me</b> when a candidate books or changes a call, and a short summary each morning.
            <span className="small muted" style={{ display: "block" }}>
              Message frequency varies. Message and data rates may apply. Reply STOP to stop, HELP for help.
            </span>
          </span>
        </label>
      )}
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      {state.ok && <p className="small" style={{ color: "var(--moss)", margin: "6px 0 0" }}>{state.ok} ✓</p>}
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {self ? "Only our team sees it. Tick the box and press Save to get texts." : textOk ? "This rep gets texts. Only the team sees the number." : "This rep hasn't turned on texts yet (they do it on My hours). Only the team sees the number."}
      </p>
    </form>
  );
}
