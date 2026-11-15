"use server";

import { revalidatePath } from "next/cache";
import { db, logActivity } from "@/lib/db";
import { escapeHtml as e, sendEmail } from "@/lib/email";
import { kit } from "@/lib/emailKit";
import { teamUrl } from "@/lib/format";
import { loadPath, pathState, STAGE_TEAM_LABEL } from "@/lib/path";
import { nextStep } from "@/lib/clientFollowUp";
import { isOwnerEmail, requireStaff, staffActor } from "@/lib/session";
import { textTeam } from "@/lib/texts";

export type RepNudgeState = { ok?: boolean; error?: string };

// A manager taps "Nudge the rep": the rep gets a short, friendly email (and a text
// if they turned texts on) asking them to check in on this one introduction.
export async function nudgeRep(_: RepNudgeState, form: FormData): Promise<RepNudgeState> {
  const me = await requireStaff();
  if (!me.manager) return { error: "Only managers can do this." };
  const unlockId = String(form.get("unlock_id") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 600);
  const { data } = await db()
    .from("unlocks")
    .select("id, owner_id, candidate_id, signed_at, passed_at, candidate_declined_at, candidates(full_name, added_by, status), owners(company, full_name, email), hires(status, created_at)")
    .eq("id", unlockId)
    .maybeSingle();
  const u = data as unknown as {
    id: string; owner_id: string; candidate_id: string; signed_at: string; passed_at: string | null; candidate_declined_at: string | null;
    candidates: { full_name: string; added_by: string | null; status: string };
    owners: { company: string | null; full_name: string | null; email: string };
    hires: { status: string; created_at: string }[];
  } | null;
  if (!u) return { error: "We couldn't find this introduction." };
  if (!u.candidates.added_by) return { error: "This candidate has no rep yet." };
  const { data: rep } = await db().from("staff").select("id, email, full_name, active").eq("id", u.candidates.added_by).maybeSingle();
  if (!rep || rep.active === false || isOwnerEmail(rep.email)) return { error: "This candidate's rep isn't on the team right now." };

  const hire = [...u.hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const p = pathState(u, await loadPath([u.id]), { hireStatus: hire?.status, candidateStatus: u.candidates.status, nowMs: Date.now() });
  const company = u.owners.company || u.owners.full_name || u.owners.email;
  const cand = u.candidates.full_name;
  const mine = (me.name || me.email).split(" ")[0];
  const html =
    kit.hi(rep.full_name) +
    kit.p(`A quick check on <strong>${e(cand)}</strong> and <strong>${e(company)}</strong>.`) +
    kit.facts([
      ["Where it stands", e(STAGE_TEAM_LABEL[p.stage])],
      ["Next", e(nextStep(p, cand).line) || null],
    ]) +
    (note ? kit.quote(note) : "") +
    kit.p("Could you check in and help it along?") +
    kit.button(`${teamUrl()}/admin/clients/${u.owner_id}`, "Open the client page") +
    kit.p(e(mine));
  const r = await sendEmail({ to: rep.email, subject: `Quick check: ${cand} and ${company}`, html, audience: "team", replyTo: me.email, fromName: me.name || undefined });
  if (!r.ok) return { error: "The email didn't go out. Try again in a minute." };
  await textTeam.nudge(rep.id, mine, cand.split(" ")[0], company, `${u.id}:${new Date().toISOString().slice(0, 10)}`).catch(() => {});
  await logActivity(staffActor(me), "rep_nudge", { unlock_id: u.id, rep_id: rep.id, by: me.name || me.email });
  revalidatePath("/admin/agreements");
  return { ok: true };
}
