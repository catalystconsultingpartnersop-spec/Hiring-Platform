import { db, logActivity } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { kit } from "./emailKit";
import { siteUrl } from "./format";
import { isCheckAccount, isOwnerEmail } from "./session";

// Removing a rep completely: everything of theirs moves to Shloimy (otherwise
// the partner, otherwise Heshy), quietly. The removed rep is never emailed.

type Row = { id: string; email: string; full_name: string | null; is_partner: boolean | null };

async function heir(removedId: string): Promise<Row | null> {
  const { data } = await db().from("staff").select("id, email, full_name, is_partner").eq("active", true);
  const team = ((data ?? []) as Row[]).filter((s) => s.id !== removedId && !isCheckAccount(s.email));
  return (
    team.find((s) => (s.full_name ?? "").trim().toLowerCase().startsWith("shloimy")) ??
    team.find((s) => s.is_partner && !isOwnerEmail(s.email)) ??
    team.find((s) => isOwnerEmail(s.email)) ??
    null
  );
}

export async function handOver(removedId: string, by: string) {
  const to = await heir(removedId);
  if (!to) return;
  const { data: gone } = await db().from("staff").select("full_name, email").eq("id", removedId).maybeSingle();
  const who = (gone?.full_name as string | null) || (gone?.email as string | null) || "A rep";

  // 1. Their candidates: the ones they added, and the ones that were theirs through an onboarding call.
  const { data: own } = await db().from("candidates").update({ added_by: to.id }).eq("added_by", removedId).select("id");
  const { data: calls } = await db().from("onboarding_calls").select("id, candidate_id, starts_at, status").eq("staff_id", removedId);
  const viaCall = [...new Set(((calls ?? []) as { candidate_id: string }[]).map((k) => k.candidate_id))];
  const { data: byCall } = viaCall.length ? await db().from("candidates").update({ added_by: to.id }).in("id", viaCall).is("added_by", null).select("id") : { data: [] };
  const candidates = (own?.length ?? 0) + (byCall?.length ?? 0);

  // 2. Their calls that haven't happened yet.
  const now = new Date().toISOString();
  const coming = ((calls ?? []) as { id: string; starts_at: string; status: string }[]).filter((k) => k.status === "booked" && k.starts_at > now);
  for (const k of coming) {
    await db().from("onboarding_calls").update({ staff_id: to.id }).eq("id", k.id);
    await (await import("./calls")).cohostForCall(k.id).catch(() => null);
  }

  // 3. Their open conversations with business owners.
  const { data: threads } = await db().from("activity_log").select("id, details").eq("action", "msg_thread").eq("details->>staff_id", removedId);
  for (const t of (threads ?? []) as { id: number; details: Record<string, unknown> }[])
    await db().from("activity_log").update({ details: { ...t.details, staff_id: to.id } }).eq("id", t.id);

  await logActivity(by, "staff_handed_over", { staff_id: removedId, to: to.id, candidates, calls: coming.length, threads: threads?.length ?? 0 });

  if (candidates || coming.length || threads?.length)
    await sendEmail({
      to: to.email,
      subject: `${who.split(" ")[0]}'s candidates are now yours`,
      audience: "team",
      html:
        kit.hi(to.full_name) +
        kit.p(`${e(who)} is no longer on the team, so their work moved to you.`) +
        kit.facts([
          ["Candidates", String(candidates)],
          ["Upcoming calls", coming.length ? String(coming.length) : null],
          ["Owner conversations", threads?.length ? String(threads.length) : null],
        ]) +
        kit.button(`${siteUrl()}/admin/candidates?view=mine`, "See your candidates") +
        (coming.length ? kit.quiet("Check the upcoming calls against your own calendar, in case any overlap.") : ""),
    }).catch(() => null);
}
