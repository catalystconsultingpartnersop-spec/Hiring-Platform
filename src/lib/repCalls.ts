import { db, logActivity } from "./db";
import { emailAdmin, sendEmail } from "./email";
import { kit, layout } from "./emailKit";
import { backOffice } from "./emails";
import { refCode, siteUrl } from "./format";
import { cleanPhone } from "./staffPhones";
import { WHEN_OPTIONS } from "./repCallOptions";

// Free 10-minute calls with the rep who met a candidate. Every owner gets two.
// Each request is a line in the activity log ("rep_call_request"); "rep_call_done"
// closes it. No new tables.
export const FREE_REP_CALLS = 2;
export const REP_CALL_MINUTES = 10;

export { WHEN_OPTIONS };

export type RepCallRequest = {
  id: string;
  at: string;
  key: string;
  candidate_id: string;
  staff_id: string | null;
  name: string;
  company: string | null;
  phone: string;
  email: string;
  when: string;
  note: string | null;
  headline: string | null;
};

const keyFor = (email: string) => `email:${email.trim().toLowerCase()}`;

export async function callsUsed(email: string | null | undefined): Promise<number> {
  if (!email) return 0;
  const { count } = await db()
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "rep_call_request")
    .eq("details->>key", keyFor(email));
  return count ?? 0;
}

// Who takes the call: the rep who met the candidate, if they're still on the team.
export async function repFor(candidateId: string): Promise<{ id: string | null; name: string; first: string; email: string | null }> {
  const { data: cand } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
  if (cand?.added_by) {
    const { data: s } = await db().from("staff").select("id, full_name, email, active").eq("id", cand.added_by).maybeSingle();
    if (s?.active) {
      const name = (s.full_name as string | null)?.trim() || "Our team";
      return { id: s.id, name, first: name.split(" ")[0], email: s.email };
    }
  }
  return { id: null, name: "Heshy", first: "Heshy", email: null };
}

export type AskResult = { ok: true; rep: string; left: number; when: string } | { ok: false; error: string };

export async function askForRepCall(input: {
  candidateId: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  when: string;
  note: string;
}): Promise<AskResult> {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 120);
  const phone = cleanPhone(input.phone) ?? (input.phone.replace(/\D/g, "").length >= 10 ? input.phone.trim().slice(0, 30) : null);
  if (!name) return { ok: false, error: "Add your name." };
  if (!phone) return { ok: false, error: "Add a phone number we can call." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Add your email, so we can confirm." };
  const when = WHEN_OPTIONS.find(([v]) => v === input.when)?.[1] ?? WHEN_OPTIONS[0][1];
  const note = input.note.trim().slice(0, 600) || null;

  const used = await callsUsed(email);
  if (used >= FREE_REP_CALLS)
    return { ok: false, error: `You've used your ${FREE_REP_CALLS} free calls. Send us a note on the Contact us page and we'll get back to you.` };

  const { data: cand } = await db().from("candidates").select("id, headline, role_category, status").eq("id", input.candidateId).maybeSingle();
  if (!cand) return { ok: false, error: "We couldn't find that candidate. Refresh and try again." };
  const rep = await repFor(cand.id);
  const company = input.company.trim().slice(0, 80) || null;
  const details = {
    key: keyFor(email),
    candidate_id: cand.id,
    staff_id: rep.id,
    name,
    company,
    phone,
    email,
    when,
    note,
    headline: cand.headline,
  };
  await logActivity("owner", "rep_call_request", details);

  const k = kit;
  const who = `${k.esc(name)}${company ? `, ${k.esc(company)}` : ""}`;
  const about = `“${k.esc(cand.headline ?? cand.role_category ?? "your candidate")}” (${refCode(cand.id)})`;
  const repHtml = layout(
    k.hi(rep.first) +
      k.big(`${who} wants a free ${REP_CALL_MINUTES}-minute call with you`) +
      k.p(`They're looking at your candidate ${about} and want to hear about them from you before deciding.`) +
      k.facts([
        ["Call", `<a href="tel:${phone.replace(/[^\d+]/g, "")}">${k.esc(phone)}</a>`],
        ["When", k.esc(when)],
        ["Email", k.esc(email)],
      ]) +
      (note ? k.quote(note) : "") +
      k.p(`Keep it to about ${REP_CALL_MINUTES} minutes: what you saw in them, how they'd fit, and what to ask them. Don't share their name or contact details yet. The owner gets those once they unlock the candidate.`) +
      k.button(backOffice("/admin"), "Mark it done when you've called"),
    "team",
  );
  const subject = `Call ${name}${company ? ` (${company})` : ""}: free ${REP_CALL_MINUTES}-min call about ${cand.role_category ?? "your candidate"}`;
  if (rep.email) await sendEmail({ to: rep.email, subject, html: repHtml, audience: "team", replyTo: email });
  await emailAdmin(rep.email ? `[Copy] ${subject} · for ${rep.name}` : subject, repHtml, { replyTo: email });

  const left = FREE_REP_CALLS - used - 1;
  await sendEmail({
    to: email,
    subject: `${rep.first} will call you about the ${cand.role_category ?? "candidate"}`,
    audience: "owner",
    html: layout(
      k.hi(name) +
        k.p(`Thanks for reaching out. ${k.esc(rep.first)} met this candidate in person and will call you at ${k.esc(phone)} (${k.esc(when.toLowerCase())}) for a free ${REP_CALL_MINUTES}-minute call.`) +
        k.box(`About: <a href="${siteUrl()}/candidates/${cand.id}">${about}</a>`) +
        k.quiet(
          left > 0
            ? `You have ${left} more free call${left === 1 ? "" : "s"} with our team, for any candidate.`
            : `That was your last free call. You can always reach us through the Contact us page.`,
        ),
      "owner",
    ),
  });
  return { ok: true, rep: rep.first, left, when };
}

// Open requests: for one rep, or (null) all of them, for the admin.
export async function openRepCalls(staffId: string | null): Promise<RepCallRequest[]> {
  const since = new Date(Date.now() - 45 * 864e5).toISOString();
  const [{ data: asks }, { data: done }] = await Promise.all([
    db().from("activity_log").select("id, at, details").eq("action", "rep_call_request").gte("at", since).order("at", { ascending: false }),
    db().from("activity_log").select("details").eq("action", "rep_call_done").gte("at", since),
  ]);
  const closed = new Set((done ?? []).map((d) => String((d.details as Record<string, unknown>)?.request ?? "")));
  return (asks ?? [])
    .filter((a) => !closed.has(String(a.id)))
    .map((a) => ({ id: String(a.id), at: a.at as string, ...(a.details as Omit<RepCallRequest, "id" | "at">) }))
    .filter((r) => staffId === null || r.staff_id === staffId);
}

export async function closeRepCall(requestId: string, by: string) {
  await logActivity(by, "rep_call_done", { request: requestId });
}

