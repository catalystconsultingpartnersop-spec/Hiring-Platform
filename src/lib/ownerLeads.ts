import { db, logActivity } from "./db";
import { escapeHtml as e, sendEmail } from "./email";
import { kit } from "./emailKit";
import { teamUrl } from "./format";
import { leaders } from "./meetUs";
import { isOwnerEmail } from "./session";

// Business owners waiting to hear from us: call-back requests from the front page,
// "call me to set a time" requests from Meet the team, and booked video calls.
// One list for Heshy and Shloimy, so nobody is missed. Kept in activity_log.

export type Lead = {
  id: string;
  kind: "callback" | "set_time";
  at: string;
  name: string;
  business: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  done: { at: string; by: string; note: string | null } | null;
};
export type Booked = { id: string; starts_at: string; minutes: number; name: string; business: string | null; role: string; phone: string | null; email: string | null; link: string | null; phoneCall: boolean };

const DAY = 864e5;

export async function ownerLeads(nowMs: number): Promise<{ waiting: Lead[]; called: Lead[]; booked: Booked[] }> {
  const since = new Date(nowMs - 30 * DAY).toISOString();
  const [{ data: reqs }, { data: dones }, { data: meets }] = await Promise.all([
    db().from("activity_log").select("id, at, action, details").in("action", ["owner_callback_request", "owner_meeting_request"]).gte("at", since).order("at", { ascending: false }),
    db().from("activity_log").select("at, details").eq("action", "owner_lead_done").gte("at", since),
    db().from("activity_log").select("id, details").eq("action", "owner_meeting").gte("details->>ends_at", new Date(nowMs).toISOString()),
  ]);
  const done = new Map(((dones ?? []) as { at: string; details: { lead_id: string; by: string; note?: string | null } }[]).map((d) => [String(d.details.lead_id), { at: d.at, by: d.details.by, note: d.details.note ?? null }]));
  const leads = ((reqs ?? []) as { id: number | string; at: string; action: string; details: Record<string, string | undefined> }[]).map(
    (r): Lead => ({
      id: String(r.id),
      kind: r.action === "owner_callback_request" ? "callback" : "set_time",
      at: r.at,
      name: r.details.name ?? "",
      business: r.details.business || null,
      role: r.details.role ?? "",
      phone: r.details.phone || null,
      email: r.details.email || null,
      done: done.get(String(r.id)) ?? null,
    }),
  );
  const booked = ((meets ?? []) as { id: number | string; details: Record<string, unknown> }[])
    .map((m): Booked => {
      const d = m.details as Record<string, string | undefined>;
      const mins = Math.round((Date.parse(d.ends_at ?? "") - Date.parse(d.starts_at ?? "")) / 60e3);
      return { id: String(m.id), starts_at: d.starts_at ?? "", minutes: mins || 20, name: d.name ?? "", business: d.business || null, role: d.role ?? "", phone: d.phone || null, email: d.email || null, link: d.link || null, phoneCall: !!m.details.phoneCall };
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return {
    waiting: leads.filter((l) => !l.done).sort((a, b) => a.at.localeCompare(b.at)),
    called: leads.filter((l) => l.done && nowMs - Date.parse(l.done.at) < 7 * DAY),
    booked,
  };
}

// Who answers call-backs: Shloimy (the partner). Heshy if there's no partner.
export async function callbackAnswerers() {
  const team = await leaders().catch(() => []);
  const partners = team.filter((l) => !isOwnerEmail(l.email));
  return partners.length ? partners : team;
}

// A call-back that's still unanswered after 30 minutes: remind Shloimy and tell
// Heshy, once. Runs every 10 minutes. Quiet between 10pm and 8am New York time.
export async function chaseWaitingCallbacks(nowMs: number) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }).format(nowMs)) % 24;
  if (hour < 8 || hour >= 22) return 0;
  const { waiting } = await ownerLeads(nowMs);
  const late = waiting.filter((l) => nowMs - Date.parse(l.at) > 30 * 60e3 && nowMs - Date.parse(l.at) < 3 * DAY);
  if (!late.length) return 0;
  const { data: told } = await db().from("activity_log").select("details").eq("action", "owner_lead_chased").in("details->>lead_id", late.map((l) => l.id));
  const already = new Set(((told ?? []) as { details: { lead_id: string } }[]).map((t) => String(t.details.lead_id)));
  const team = await leaders().catch(() => []);
  let n = 0;
  for (const l of late) {
    if (already.has(l.id)) continue;
    const mins = Math.round((nowMs - Date.parse(l.at)) / 60e3);
    const waited = mins < 90 ? `${mins} minutes` : `${Math.round(mins / 60)} hours`;
    for (const t of team)
      await sendEmail({
        to: t.email,
        subject: `Still waiting for a call: ${l.name}, ${l.role}`,
        audience: "team",
        html:
          kit.big(`${e(l.name)} has been waiting ${waited}`) +
          kit.facts([
            ["Hiring for", e(l.role)],
            ["Phone", l.phone ? e(l.phone) : null],
            ["Email", l.email ? e(l.email) : null],
          ]) +
          kit.button(`${teamUrl()}/admin/waiting`, "Open the waiting list") +
          kit.quiet("Once they've been called, press “I called them” on the list so this stops."),
      }).catch(() => null);
    await logActivity("system", "owner_lead_chased", { lead_id: l.id });
    n++;
  }
  return n;
}
