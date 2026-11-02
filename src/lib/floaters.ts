import { db, logActivity } from "./db";

// "No floaters": every candidate should have a rep on file, and everyone who
// hasn't been spoken to yet should have a call on the calendar.

type Cand = { id: string; full_name: string; email: string; status: string; added_by: string | null; created_at: string };
type Call = { id: string; candidate_id: string; staff_id: string; starts_at: string; ends_at: string; status: string };

export type Floater = { id: string; name: string; email: string; status: string; rep: string | null; why: string; callWith?: string; callAt?: string };

export async function findFloaters(): Promise<{ noRep: Floater[]; noCall: Floater[]; otherRep: Floater[]; total: number }> {
  const now = Date.now();
  const [{ data: cands }, { data: calls }, { data: staff }] = await Promise.all([
    db().from("candidates").select("id, full_name, email, status, added_by, created_at").neq("status", "archived").order("created_at", { ascending: false }),
    db().from("onboarding_calls").select("id, candidate_id, staff_id, starts_at, ends_at, status").neq("status", "cancelled").order("starts_at", { ascending: true }),
    db().from("staff").select("id, full_name, email"),
  ]);
  const name = new Map(((staff ?? []) as { id: string; full_name: string | null; email: string }[]).map((s) => [s.id, s.full_name || s.email]));
  const byCand = new Map<string, Call[]>();
  for (const k of (calls ?? []) as Call[]) byCand.set(k.candidate_id, [...(byCand.get(k.candidate_id) ?? []), k]);
  const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const noRep: Floater[] = [];
  const noCall: Floater[] = [];
  const otherRep: Floater[] = [];
  const rows = (cands ?? []) as Cand[];
  for (const c of rows) {
    const ks = byCand.get(c.id) ?? [];
    const next = ks.find((k) => k.status === "booked" && Date.parse(k.ends_at) >= now);
    const spoken = ks.some((k) => k.status === "done");
    const base = { id: c.id, name: c.full_name, email: c.email, status: c.status, rep: c.added_by ? (name.get(c.added_by) ?? "unknown") : null };
    const call = next ? { callWith: name.get(next.staff_id) ?? "unknown", callAt: when(next.starts_at) } : {};
    if (!c.added_by) noRep.push({ ...base, ...call, why: next ? "No rep on file (has a call)" : "No rep on file" });
    const early = c.status === "applied" || c.status === "draft";
    if (early && !next && !spoken) {
      const missed = ks.some((k) => k.status === "no_show" || (k.status === "booked" && Date.parse(k.ends_at) < now));
      noCall.push({ ...base, why: missed ? "Missed or unmarked call, nothing new booked" : "Never booked a call" });
    }
    if (next && c.added_by && next.staff_id !== c.added_by) otherRep.push({ ...base, ...call, why: "Call is with a different rep than their own" });
  }
  return { noRep, noCall, otherRep, total: rows.length };
}

export function floaterReportHtml(f: Awaited<ReturnType<typeof findFloaters>>): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const list = (title: string, rows: Floater[]) =>
    `<h3>${title} (${rows.length})</h3>` +
    (rows.length
      ? `<ul>${rows
          .map(
            (r) =>
              `<li><strong>${esc(r.name)}</strong> &lt;${esc(r.email)}&gt;, status ${esc(r.status)}, rep: ${esc(r.rep ?? "none")}${r.callWith ? `, call with ${esc(r.callWith)} ${esc(r.callAt ?? "")}` : ""}. ${esc(r.why)}</li>`,
          )
          .join("")}</ul>`
      : "<p>None.</p>");
  return `<p>Checked ${f.total} candidates.</p>${list("No rep on file", f.noRep)}${list("Not spoken to yet and no call booked", f.noCall)}${list("Call booked with someone other than their rep", f.otherRep)}`;
}

// One-time cleanup (Nov 2): give everyone with a booked call and no rep the rep who hosts
// their call, and archive the test sign-ups. Nobody is emailed. Runs once.
const FIX_FLAG = "floater_fix_2026_11_02";
const TEST_EMAILS = ["shlomo.scrubmatch@gmail.com", "shloimiem@gmail.com"];
export async function fixFloatersOnce(): Promise<string | null> {
  const { getSetting, setSetting } = await import("./settings");
  if (await getSetting<boolean>(FIX_FLAG, false)) return null;
  await setSetting(FIX_FLAG, true);
  const now = Date.now();
  const [{ data: cands }, { data: calls }, { data: staff }] = await Promise.all([
    db().from("candidates").select("id, full_name, email, status, added_by").neq("status", "archived"),
    db().from("onboarding_calls").select("candidate_id, staff_id, starts_at, ends_at, status").eq("status", "booked").order("starts_at", { ascending: true }),
    db().from("staff").select("id, full_name, email"),
  ]);
  const name = new Map(((staff ?? []) as { id: string; full_name: string | null; email: string }[]).map((s) => [s.id, s.full_name || s.email]));
  const lines: string[] = [];
  for (const c of (cands ?? []) as Cand[]) {
    if (TEST_EMAILS.includes(c.email.toLowerCase()) && c.status === "applied") {
      await db().from("candidates").update({ status: "archived" }).eq("id", c.id);
      lines.push(`Archived test sign-up: ${c.full_name} (${c.email})`);
      continue;
    }
    if (c.added_by) continue;
    const next = ((calls ?? []) as Call[]).find((k) => k.candidate_id === c.id && Date.parse(k.ends_at) >= now);
    if (!next) continue;
    await db().from("candidates").update({ added_by: next.staff_id }).eq("id", c.id).is("added_by", null);
    lines.push(`${c.full_name} → ${name.get(next.staff_id) ?? "their call host"}`);
  }
  await logActivity("system", "floater_fix", { lines });
  return lines.join("\n");
}
