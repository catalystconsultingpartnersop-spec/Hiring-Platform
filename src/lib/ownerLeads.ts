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
  done: { at: string; by: string; note: string | null; declined: boolean } | null;
};
export type Booked = { id: string; token: string | null; owner_tz: string | null; staff_id: string | null; declined?: { at: string; by: string } | null; starts_at: string; minutes: number; name: string; business: string | null; role: string; phone: string | null; email: string | null; link: string | null; phoneCall: boolean };

const DAY = 864e5;

export async function ownerLeads(nowMs: number): Promise<{ waiting: Lead[]; called: Lead[]; booked: Booked[]; declinedCalls: Booked[] }> {
  const since = new Date(nowMs - 30 * DAY).toISOString();
  const [{ data: reqs }, { data: dones }, { data: meets }] = await Promise.all([
    db().from("activity_log").select("id, at, action, details").in("action", ["owner_callback_request", "owner_meeting_request"]).gte("at", since).order("at", { ascending: false }),
    db().from("activity_log").select("at, details").eq("action", "owner_lead_done").gte("at", since),
    db().from("activity_log").select("id, details").eq("action", "owner_meeting").gte("details->>ends_at", new Date(nowMs).toISOString()),
  ]);
  const done = new Map(((dones ?? []) as { at: string; details: { lead_id: string; by: string; note?: string | null; outcome?: string } }[]).map((d) => [String(d.details.lead_id), { at: d.at, by: d.details.by, note: d.details.note ?? null, declined: d.details.outcome === "declined" }]));
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
  const all = ((meets ?? []) as { id: number | string; details: Record<string, unknown> }[])
    .map((m): Booked => {
      const d = m.details as Record<string, string | undefined>;
      const mins = Math.round((Date.parse(d.ends_at ?? "") - Date.parse(d.starts_at ?? "")) / 60e3);
      const dec = m.details.cancelled ? { at: d.declined_at ?? "", by: d.declined_by ?? "" } : null;
      return { id: String(m.id), token: d.token || null, owner_tz: d.owner_tz || null, staff_id: d.staff_id || null, declined: dec, starts_at: d.starts_at ?? "", minutes: mins || 20, name: d.name ?? "", business: d.business || null, role: d.role ?? "", phone: d.phone || null, email: d.email || null, link: d.link || null, phoneCall: !!m.details.phoneCall };
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const booked = all.filter((m) => !m.declined);
  return {
    waiting: leads.filter((l) => !l.done).sort((a, b) => a.at.localeCompare(b.at)),
    called: leads.filter((l) => l.done && nowMs - Date.parse(l.done.at) < 7 * DAY),
    booked,
    declinedCalls: all.filter((m) => m.declined),
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

// The ready words when we decline a booked call. Whoever declines can change them.
export function declineText(ownerName: string, by: string, whenText: string) {
  const first = (n: string) => n.trim().split(" ")[0] || "there";
  return `Hi ${first(ownerName)},\n\nThank you for reaching out and booking a call with us. We appreciate you thinking of us.\n\nWe need to cancel our call${whenText ? ` on ${whenText}` : ""}, and we're sorry for the change. At the moment we aren't able to give your search the attention it deserves.\n\nYou're always welcome to browse our candidates on the site, and if someone catches your eye, we'd be glad to hear from you.\n\nWishing you much success with the hire.\n\n${first(by)}\nThe Candidate Collection`;
}

// Decline a booked video call: tell the owner kindly, cancel it in everyone's
// calendar, and open the time back up.
export async function declineMeeting(meetingId: string, message: string, by: { name: string; email: string }) {
  const { data } = await db().from("activity_log").select("id, details").eq("id", meetingId).eq("action", "owner_meeting").maybeSingle();
  const d = data?.details as (Record<string, string | undefined> & { cancelled?: boolean }) | undefined;
  if (!data || !d) return { error: "We couldn't find that call." };
  if (d.cancelled) return { ok: true as const };
  await db().from("activity_log").update({ details: { ...d, cancelled: true, declined_by: by.name, declined_at: new Date().toISOString() } }).eq("id", data.id);
  const { callIcs } = await import("./ics");
  const { formatInZone, COMPANY_TZ } = await import("./time");
  const ics = d.starts_at && d.ends_at && d.token ? callIcs({ uid: `meet-${d.token}@thecandidatecollection.com`, start: d.starts_at, end: d.ends_at, title: "Cancelled: call with The Candidate Collection", description: "This call was cancelled.", cancelled: true }) : null;
  const attachments = ics ? [{ filename: "cancelled.ics", content: Buffer.from(ics) }] : undefined;
  const paras = message.trim().split(/\n\s*\n/).map((p) => kit.p(e(p.trim()).replace(/\n/g, "<br>"))).join("");
  let sent = true;
  if (d.email) {
    const r = await sendEmail({ to: d.email, subject: `About our call${d.starts_at ? ` on ${formatInZone(d.starts_at, d.owner_tz || COMPANY_TZ)}` : ""}`, audience: "owner", html: paras, replyTo: by.email, fromName: by.name, attachments }).catch(() => ({ ok: false }));
    sent = !!(r as { ok?: boolean }).ok;
  }
  for (const l of await leaders().catch(() => []))
    await sendEmail({
      to: l.email,
      subject: `Cancelled: call with ${d.business || d.name}`,
      audience: "team",
      html: kit.big(`${e(by.name.split(" ")[0])} declined the call with ${e(d.name ?? "")}`) + kit.p(`${d.starts_at ? e(formatInZone(d.starts_at, COMPANY_TZ)) : ""}. The owner was told, and the time is open again.`) + kit.quiet("Open the attached file to take it off your calendar, if your calendar hasn't already."),
      attachments,
    }).catch(() => null);
  await logActivity(`staff:${by.email}`, "owner_meeting_declined", { meeting_id: meetingId, owner_emailed: sent });
  return { ok: true as const, emailed: sent };
}

// An owner asks for a call back: from the front page form, or from Meet the team
// when no time suits them. Lands on the waiting list and goes to Shloimy.
export async function fileCallback(o: { role: string; name: string; phone: string; email?: string; business?: string; from: "home" | "meet" }) {
  await logActivity(`public:${o.phone}`, "owner_callback_request", { role: o.role, name: o.name, phone: o.phone, email: o.email || undefined, business: o.business || undefined, from: o.from });
  await db()
    .from("positions")
    .insert({ title: o.role, company: o.business || null, source: "callback", contact_name: o.name, contact_email: o.email || null, needs: `Call back: ${o.phone}`, added_by: "callback" })
    .then(
      () => null,
      () => null,
    );
  for (const l of await callbackAnswerers())
    await sendEmail({
      to: l.email,
      subject: `Call back: ${o.name}, hiring for ${o.role}`,
      audience: "team",
      html:
        kit.big(`${e(o.name)} wants a call back`) +
        kit.facts([
          ["Hiring for", e(o.role)],
          ["Business", o.business ? e(o.business) : null],
          ["Phone", e(o.phone)],
          ["Email", o.email ? e(o.email) : null],
        ]) +
        kit.button(`${teamUrl()}/admin/candidates?q=${encodeURIComponent(o.role)}`, "Search the collection for this") +
        kit.button(`${teamUrl()}/admin/waiting`, "Mark them as called") +
        kit.quiet("The front page says they can have a candidate to consider half an hour later. If no one fits, tell them straight, and that we can look."),
    }).catch(() => null);
}
