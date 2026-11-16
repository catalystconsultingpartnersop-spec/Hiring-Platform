import type { Metadata } from "next";
import { db } from "@/lib/db";
import { pendingAsks, readAskToken } from "@/lib/timeAsk";
import { answer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Can you take this call?", robots: { index: false } };

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const DONE: Record<string, string> = {
  moved: "Done. The call is yours, and the details are in your email.",
  rebook: "Got it. The call was cancelled, and the candidate got a link to pick a new time with you.",
  busy: "You already have another call at that time, so this one wasn't moved. Tap No to let the candidate pick a new time.",
  gone: "This one is already settled. Nothing more to do.",
};

// The new rep's one-tap answer, from the email or text. Signed link, no sign-in needed.
export default async function CallTimePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const t = readAskToken(token);
  const { data: k } = t ? await db().from("onboarding_calls").select("id, starts_at, status, candidates(full_name), staff(full_name)").eq("id", t.callId).maybeSingle() : { data: null };
  const open = t && k && k.status === "booked" && (await pendingAsks([t.callId])).get(t.callId)?.to === t.repId;
  const cand = (k?.candidates as unknown as { full_name: string } | undefined)?.full_name ?? "the candidate";
  const cur = ((k?.staff as unknown as { full_name: string | null } | null)?.full_name ?? "the current rep").split(" ")[0];
  return (
    <div className="wrap narrow" style={{ paddingTop: 48, paddingBottom: 72 }}>
      {done && DONE[done] ? (
        <>
          <h1 style={{ fontSize: 32 }}>{done === "busy" ? "Not moved" : "Thank you"}</h1>
          <p style={{ fontSize: 18 }}>{DONE[done]}</p>
          {done === "busy" && open && (
            <form action={answer.bind(null, token, false)}>
              <button className="btn">No, let them pick a new time</button>
            </form>
          )}
        </>
      ) : !open || !k ? (
        <>
          <h1 style={{ fontSize: 32 }}>Already settled</h1>
          <p style={{ fontSize: 18 }}>{DONE.gone}</p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>Can you take this call?</h1>
          <div className="panel" style={{ margin: "20px 0", fontSize: 18 }}>
            <p style={{ margin: 0 }}>
              <strong>{cand}</strong>
            </p>
            <p style={{ margin: "6px 0 0" }}>{when(k.starts_at)}</p>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              Booked with {cur}. It stays with {cur} until you answer.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <form action={answer.bind(null, token, true)}>
              <button className="btn btn-gold btn-big">Yes, I&rsquo;ll take it</button>
            </form>
            <form action={answer.bind(null, token, false)}>
              <button className="btn btn-ghost btn-big">No, let them pick a new time</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
