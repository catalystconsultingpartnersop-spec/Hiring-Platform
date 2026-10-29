"use client";

import Link from "next/link";
import { useActionState } from "react";
import { dateShort } from "@/lib/format";

import { FormState, saveRepTerms, sendOnboardingPackage } from "../../../actions";
import { CommissionFields } from "../CommissionFields";

// Heshy sets a rep's own terms, then sends them their onboarding package.
export function RepTerms(p: {
  staffId: string;
  name: string;
  defaultPercent: number;
  type: "percent" | "flat" | null;
  value: number | null;
  note: string | null;
  sentAt: string | null;
  signedAt: string | null;
  isRep: boolean;
}) {
  const [saved, save, saving] = useActionState<FormState, FormData>(saveRepTerms.bind(null, p.staffId), {});
  const [sent, send, sending] = useActionState<FormState>(sendOnboardingPackage.bind(null, p.staffId), {});
  const first = p.name.split(" ")[0];
  return (
    <section className="panel" id="terms" style={{ marginTop: 18, display: "grid", gap: 18 }}>
      <form action={save}>
        <h2 style={{ fontSize: 19, margin: 0 }}>{first}&rsquo;s terms</h2>
        <CommissionFields defaultPercent={p.defaultPercent} type={p.type} value={p.value} note={p.note} />
        {saved.error && <p className="notice notice-bad" style={{ marginTop: 10 }}>{saved.error}</p>}
        {saved.ok && <p className="notice notice-good" style={{ marginTop: 10 }}>{saved.ok}</p>}
        <button className="btn btn-small" type="submit" disabled={saving} style={{ marginTop: 12 }}>
          {saving ? "Saving…" : "Save terms"}
        </button>
      </form>
      <form action={send} style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
        <h2 style={{ fontSize: 19, margin: 0 }}>Onboarding package</h2>
        <p className="small muted" style={{ margin: "6px 0 12px" }}>
          One email with the mission, {first}&rsquo;s terms above, five steps to get started, and a fresh link to set a password.
          {p.sentAt ? ` Last sent ${dateShort(p.sentAt)}.` : " Not sent yet."}
          {p.isRep && (p.signedAt ? ` Agreement signed ${dateShort(p.signedAt)}.` : " They sign their agreement when they first sign in.")}
          {p.isRep && p.signedAt && (
            <>
              {" "}
              <Link href={`/admin/agreement?id=${p.staffId}`}>See it</Link>.
            </>
          )}
        </p>
        {sent.error && <p className="notice notice-bad" style={{ marginBottom: 10 }}>{sent.error}</p>}
        {sent.ok && <p className="notice notice-good" style={{ marginBottom: 10 }}>{sent.ok}</p>}
        <button className="btn btn-gold btn-small" type="submit" disabled={sending}>
          {sending ? "Sending…" : p.sentAt ? `Send ${first}'s package again` : `Send ${first} the onboarding package`}
        </button>
      </form>
    </section>
  );
}
