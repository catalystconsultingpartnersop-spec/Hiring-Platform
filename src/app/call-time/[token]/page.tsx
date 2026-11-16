import type { Metadata } from "next";
import { db } from "@/lib/db";
import { pendingAsks, readAskToken } from "@/lib/timeAsk";
import { answer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Can you take this candidate?", robots: { index: false } };

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const DONE: Record<string, string> = {
  moved: "Done. The call is yours, and the details are in your email.",
  rebook: "Got it. The call was cancelled, and the candidate got a link to pick a time in your open hours.",
  declined: "Got it. The candidate is back with the rep who had them, and the call hasn't changed.",
  busy: "You already have another call at that time, so this one wasn't moved. You can still take the candidate at a different time.",
  gone: "This one is already settled. Nothing more to do.",
};

// The new rep's one-tap answer, from the email or text. Signed link, no sign-in needed.
export default async function CallTimePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const t = readAskToken(token);
  const { data: k } = t ? await db().from("onboarding_calls").select("id, starts_at, status, candidates(full_name), staff(full_name)").eq("id", t.callId).maybeSingle() : { data: null };
  const ask = t ? (await pendingAsks([t.callId])).get(t.callId) : undefined;
  const open = t && k && k.status === "booked" && ask?.to === t.repId;
  const me = (ask?.to_name ?? "there").split(" ")[0];
  const from = (ask?.by_name ?? "").split(" ")[0];
  const cand = (k?.candidates as unknown as { full_name: string } | undefined)?.full_name ?? "the candidate";
  return (
    <div className="wrap narrow" style={{ paddingTop: 48, paddingBottom: 72 }}>
      {done && DONE[done] ? (
        <>
          <h1 style={{ fontSize: 32 }}>{done === "busy" ? "Not moved" : "Thank you"}</h1>
          <p style={{ fontSize: 18 }}>{DONE[done]}</p>
          {done === "busy" && open && (
            <form action={answer.bind(null, token, "retime")}>
              <button className="btn">I&rsquo;ll take them, at a different time</button>
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
          <h1 style={{ fontSize: 30, lineHeight: 1.15 }}>
            Hi {me}, could you take {cand.split(" ")[0]}?
          </h1>
          <div className="panel" style={{ margin: "20px 0", fontSize: 18 }}>
            <p style={{ margin: 0 }}>
              {from ? `${from} was thinking you should take ` : "You were asked to take "}
              <strong>{cand}</strong>.
            </p>
            <p style={{ margin: "10px 0 0" }}>
              There&rsquo;s a call already booked for <strong>{when(k.starts_at)}</strong>. That&rsquo;s outside your open hours. Could you make an exception?
            </p>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <form action={answer.bind(null, token, "yes")}>
              <button className="btn btn-gold btn-big" style={{ width: "100%" }}>Yes, no problem</button>
            </form>
            <form action={answer.bind(null, token, "retime")}>
              <button className="btn btn-ghost btn-big" style={{ width: "100%", whiteSpace: "normal", height: "auto", padding: "12px 18px" }}>
                Happy to take {cand.split(" ")[0]}, but not at that time. Please reschedule.
              </button>
            </form>
            <form action={answer.bind(null, token, "decline")}>
              <button className="btn btn-ghost btn-big" style={{ width: "100%" }}>I can&rsquo;t take this candidate</button>
            </form>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Nothing changes until you answer. {from ? `${from} hears back right away.` : ""}
          </p>
        </>
      )}
    </div>
  );
}
