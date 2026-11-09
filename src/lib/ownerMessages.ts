import { randomUUID } from "node:crypto";
import { db, logActivity } from "./db";
import { emailAdmin, sendEmail } from "./email";
import { kit, layout } from "./emailKit";
import { refCode, siteUrl, teamUrl } from "./format";
import { signedToken } from "./session";
import { cleanPhone } from "./staffPhones";

// Owners message the rep who met a candidate, right on the site. Each
// conversation and message is a line in the activity log (no new tables):
//   msg_thread  {thread, email, name, company, phone, candidate_id, staff_id, headline, role}
//   msg         {thread, from: "owner" | "rep", by, text, kind}
//   msg_cutoff  {thread, email, by}: an owner taking advantage was told they've reached the limit
//   msg_reopen  {email, by}: Heshy reopened them

export type MsgKind = "call" | "question" | "other";
export type Thread = {
  id: string;
  at: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  candidate_id: string;
  staff_id: string | null;
  headline: string | null;
  role: string | null;
  candidate_name: string | null;
};
export type Msg = { id: string; at: string; from: "owner" | "rep"; by: string; text: string; kind?: MsgKind };

export const ownerLink = (threadId: string) => `${siteUrl()}/talk/${signedToken(`thr_${threadId}`, 180)}`;
export const repLink = (threadId: string) => `${teamUrl()}/admin/messages/${threadId}`;

// Only ever sent to an owner who is taking advantage. They've already unlocked the
// candidate, so it points them to reach out to the candidate directly.
export function limitText(name: string, candidateFirst: string) {
  const first = name.split(" ")[0] || "there";
  const them = candidateFirst || "the candidate";
  return `Thanks for all your questions, ${first}. You've reached the limit of the free time our reps can give to each business. Our reps are here to give you their honest read on a candidate, but we're limited in how much ongoing consulting and coaching we can do. You have everything you need to reach out to ${them} directly: their phone number, email and resume are on their page. And Hiring help covers interviewing, references and making an offer.`;
}

// Who answers: the rep who met the candidate, if they're still on the team.
export async function repFor(candidateId: string): Promise<{ id: string | null; first: string; email: string | null }> {
  const { data: cand } = await db().from("candidates").select("added_by").eq("id", candidateId).maybeSingle();
  if (cand?.added_by) {
    const { data: s } = await db().from("staff").select("id, full_name, email, active").eq("id", cand.added_by).maybeSingle();
    if (s?.active) return { id: s.id, first: ((s.full_name as string | null)?.trim() || "Our team").split(" ")[0], email: s.email };
  }
  return { id: null, first: "Heshy", email: null };
}

async function staffName(staffId: string | null) {
  if (!staffId) return { first: "Heshy", email: null as string | null };
  const { data } = await db().from("staff").select("full_name, email").eq("id", staffId).maybeSingle();
  return { first: ((data?.full_name as string | null)?.trim() || "Our team").split(" ")[0], email: (data?.email as string | null) ?? null };
}

export async function isCutOff(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { data } = await db()
    .from("activity_log")
    .select("action, at")
    .in("action", ["msg_cutoff", "msg_reopen"])
    .eq("details->>email", email.trim().toLowerCase())
    .order("at", { ascending: false })
    .limit(1);
  return data?.[0]?.action === "msg_cutoff";
}

const toThread = (row: { id: number | string; at: string; details: unknown }): Thread => {
  const d = row.details as Record<string, unknown>;
  return {
    id: String(d.thread),
    at: row.at,
    email: String(d.email ?? ""),
    name: String(d.name ?? ""),
    company: (d.company as string) ?? null,
    phone: (d.phone as string) ?? null,
    candidate_id: String(d.candidate_id ?? ""),
    staff_id: (d.staff_id as string) ?? null,
    headline: (d.headline as string) ?? null,
    role: (d.role as string) ?? null,
    candidate_name: (d.candidate_name as string) ?? null,
  };
};

export async function getThread(threadId: string): Promise<{ t: Thread; msgs: Msg[]; cutOff: boolean } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return null;
  const { data: rows } = await db()
    .from("activity_log")
    .select("id, at, action, details")
    .in("action", ["msg_thread", "msg"])
    .eq("details->>thread", threadId)
    .order("at", { ascending: true });
  const head = (rows ?? []).find((r) => r.action === "msg_thread");
  if (!head) return null;
  const t = toThread(head);
  const msgs = (rows ?? [])
    .filter((r) => r.action === "msg")
    .map((r) => {
      const d = r.details as Record<string, unknown>;
      return { id: String(r.id), at: r.at as string, from: d.from === "rep" ? "rep" : "owner", by: String(d.by ?? ""), text: String(d.text ?? ""), kind: d.kind as MsgKind } as Msg;
    });
  return { t, msgs, cutOff: await isCutOff(t.email) };
}

// The owner's open conversation about this candidate, if there is one.
async function findThread(email: string, candidateId: string): Promise<Thread | null> {
  const { data } = await db()
    .from("activity_log")
    .select("id, at, details")
    .eq("action", "msg_thread")
    .eq("details->>email", email)
    .eq("details->>candidate_id", candidateId)
    .order("at", { ascending: false })
    .limit(1);
  return data?.[0] ? toThread(data[0]) : null;
}

export type SendResult = { ok: true; rep: string; link: string; threadId: string } | { ok: false; error: string };

// An owner's message from the candidate page: a new conversation, or the next
// message in the one they already have about this candidate.
export async function ownerWrites(input: {
  ownerId: string;
  candidateId: string;
  kind: MsgKind;
  name: string;
  company: string;
  phone: string;
  email: string;
  when: string;
  text: string;
}): Promise<SendResult> {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 120);
  const kind: MsgKind = ["call", "question", "other"].includes(input.kind) ? input.kind : "question";
  const phone = cleanPhone(input.phone) ?? (input.phone.replace(/\D/g, "").length >= 10 ? input.phone.trim().slice(0, 30) : null);
  const note = input.text.trim().slice(0, 1500);
  if (!name) return { ok: false, error: "Add your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Add your email, so you get the answer." };
  if (kind === "call" && !phone) return { ok: false, error: "Add a phone number to call." };
  if (kind !== "call" && !note) return { ok: false, error: "Write your question." };
  if (await isCutOff(email)) return { ok: false, error: "cutoff" };
  // Talking to the rep comes with unlocking the candidate.
  const { data: unlocked } = await db()
    .from("unlocks")
    .select("id")
    .eq("owner_id", input.ownerId)
    .eq("candidate_id", input.candidateId)
    .not("confirmed_at", "is", null)
    .maybeSingle();
  if (!unlocked) return { ok: false, error: "Unlock this candidate to talk to the rep who met them." };

  const { data: cand } = await db().from("candidates").select("id, headline, role_category, full_name").eq("id", input.candidateId).maybeSingle();
  if (!cand) return { ok: false, error: "We couldn't find that candidate. Refresh and try again." };

  let t = await findThread(email, cand.id);
  const isNew = !t;
  if (!t) {
    const rep = await repFor(cand.id);
    const id = randomUUID();
    const company = input.company.trim().slice(0, 80) || null;
    await logActivity("owner", "msg_thread", {
      thread: id,
      email,
      name,
      company,
      phone,
      candidate_id: cand.id,
      staff_id: rep.id,
      headline: cand.headline,
      role: cand.role_category,
      candidate_name: cand.full_name,
    });
    t = { id, at: new Date().toISOString(), email, name, company, phone, candidate_id: cand.id, staff_id: rep.id, headline: cand.headline, role: cand.role_category, candidate_name: cand.full_name };
  }
  const when = input.when.trim().slice(0, 40);
  const text =
    kind === "call"
      ? `Hi, I'd like to talk to you about this candidate. Please call me at ${phone}${when ? `, ${when.toLowerCase()}` : ""}.${note ? `\n\n${note}` : ""}`
      : note;
  await logActivity("owner", "msg", { thread: t.id, from: "owner", by: name, text, kind });
  await notifyRep(t, text, kind, isNew);
  const rep = await staffName(t.staff_id);
  return { ok: true, rep: rep.first, link: ownerLink(t.id), threadId: t.id };
}

export async function ownerReplies(threadId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const th = await getThread(threadId);
  if (!th) return { ok: false, error: "This conversation wasn't found." };
  if (th.cutOff) return { ok: false, error: "cutoff" };
  const body = text.trim().slice(0, 1500);
  if (!body) return { ok: false, error: "Write a message first." };
  await logActivity("owner", "msg", { thread: threadId, from: "owner", by: th.t.name, text: body, kind: "other" });
  await notifyRep(th.t, body, "other", false);
  return { ok: true };
}

export async function repReplies(threadId: string, by: { id: string | null; name: string }, text: string, steppingInFor?: string) {
  const th = await getThread(threadId);
  if (!th) return { ok: false, error: "Not found." };
  const body = text.trim().slice(0, 2000);
  if (!body) return { ok: false, error: "Write an answer first." };
  const first = by.name.split(" ")[0];
  await logActivity(by.id ?? "admin", "msg", { thread: threadId, from: "rep", by: steppingInFor ? `${first}, for ${steppingInFor}` : first, text: body });
  const k = kit;
  await sendEmail({
    to: th.t.email,
    subject: `${first} answered your message about the ${th.t.role ?? "candidate"}`,
    audience: "owner",
    html: layout(
      k.hi(th.t.name) +
        k.p(`${k.esc(first)} answered your message about ${about(th.t)}:`) +
        k.quote(body) +
        k.button(ownerLink(threadId), "Read and reply"),
      "owner",
    ),
  });
  return { ok: true };
}

// Only for an owner taking advantage: a polite note that they've reached the limit.
// The conversation and its history stay; they just can't send more messages.
export async function setLimit(threadId: string, by: { id: string | null; name: string }) {
  const th = await getThread(threadId);
  if (!th || th.cutOff) return;
  const text = limitText(th.t.name, (th.t.candidate_name ?? "").split(" ")[0]);
  await logActivity(by.id ?? "admin", "msg", { thread: threadId, from: "rep", by: by.name.split(" ")[0], text });
  await logActivity(by.id ?? "admin", "msg_cutoff", { thread: threadId, email: th.t.email, by: by.name });
  const k = kit;
  await sendEmail({
    to: th.t.email,
    subject: `About your conversation with ${by.name.split(" ")[0]}`,
    audience: "owner",
    html: layout(
      k.p(k.esc(text)) +
        k.button(`${siteUrl()}/candidates/${th.t.candidate_id}`, `Open ${(th.t.candidate_name ?? "").split(" ")[0] || "their"}'s page`) +
        k.quiet(`<a href="${siteUrl()}/hiring-help">Hiring help</a>`),
      "owner",
    ),
  });
  await emailAdmin(`${by.name} told ${th.t.name} they've reached the limit`, layout(k.p(`About ${about(th.t)}. <a href="${repLink(threadId)}">See the conversation</a>.`)));
}

export async function reopen(email: string, by: string) {
  await logActivity(by, "msg_reopen", { email: email.trim().toLowerCase(), by });
}

function about(t: Thread) {
  return `${t.candidate_name ? `${kit.esc(t.candidate_name)}, ` : ""}“${kit.esc(t.headline ?? t.role ?? "the candidate")}” (${refCode(t.candidate_id)})`;
}

async function notifyRep(t: Thread, text: string, kind: MsgKind, isNew: boolean) {
  const rep = await staffName(t.staff_id);
  const k = kit;
  const who = `${k.esc(t.name)}${t.company ? ` (${k.esc(t.company)})` : ""}`;
  const head =
    kind === "call"
      ? `${who} wants you to call them about ${about(t)}`
      : kind === "question" && isNew
        ? `${who} has a question about ${about(t)}`
        : `New message from ${who} about ${about(t)}`;
  const html = layout(
    k.hi(rep.first) +
      k.big(head) +
      k.quote(text) +
      k.facts([
        ["Phone", t.phone ? `<a href="tel:${t.phone.replace(/[^\d+]/g, "")}">${k.esc(t.phone)}</a>` : null],
        ["Email", k.esc(t.email)],
      ]) +
      k.button(repLink(t.id), "Open the conversation") +
      k.quiet("They've unlocked this candidate, so they already have their name, phone and resume. Answer in the conversation and the owner gets an email. If an owner starts taking advantage, “Set a limit” sends them a polite note and stops further messages."),
    "team",
  );
  const whoPlain = `${t.name}${t.company ? ` (${t.company})` : ""}`;
  const yourRole = t.candidate_name ? `${t.candidate_name} (${t.role ?? "your candidate"})` : `your ${t.role ?? "candidate"} (${refCode(t.candidate_id)})`;
  const subject =
    kind === "call" ? `${whoPlain} wants you to call about ${yourRole}` : kind === "question" && isNew ? `${whoPlain} has a question about ${yourRole}` : `New message from ${whoPlain} about ${yourRole}`;
  // Only the rep it belongs to. Heshy and partners hear about it only if it sits unanswered (see overdueAlerts).
  if (rep.email) await sendEmail({ to: rep.email, subject, html, audience: "team", replyTo: t.email });
  else await emailAdmin(subject, html, { replyTo: t.email });
}

export type ThreadRow = Thread & { last: Msg | null; waiting: boolean; cutOff: boolean; count: number };

// Conversations for one rep, or (null) everyone's, newest activity first.
export async function listThreads(staffId: string | null): Promise<ThreadRow[]> {
  const since = new Date(Date.now() - 180 * 864e5).toISOString();
  const [{ data: heads }, { data: msgs }, { data: cuts }] = await Promise.all([
    db().from("activity_log").select("id, at, details").eq("action", "msg_thread").gte("at", since),
    db().from("activity_log").select("id, at, details").eq("action", "msg").gte("at", since).order("at", { ascending: true }),
    db().from("activity_log").select("action, at, details").in("action", ["msg_cutoff", "msg_reopen"]).order("at", { ascending: true }),
  ]);
  const cutState = new Map<string, boolean>();
  for (const c of cuts ?? []) cutState.set(String((c.details as Record<string, unknown>).email ?? ""), c.action === "msg_cutoff");
  const byThread = new Map<string, Msg[]>();
  for (const m of msgs ?? []) {
    const d = m.details as Record<string, unknown>;
    const list = byThread.get(String(d.thread)) ?? [];
    list.push({ id: String(m.id), at: m.at as string, from: d.from === "rep" ? "rep" : "owner", by: String(d.by ?? ""), text: String(d.text ?? "") });
    byThread.set(String(d.thread), list);
  }
  return (heads ?? [])
    .map(toThread)
    .filter((t) => staffId === null || t.staff_id === staffId)
    .map((t) => {
      const list = byThread.get(t.id) ?? [];
      const last = list.at(-1) ?? null;
      const cutOff = cutState.get(t.email) ?? false;
      return { ...t, last, count: list.length, cutOff, waiting: !cutOff && last?.from === "owner" };
    })
    .sort((a, b) => (b.last?.at ?? b.at).localeCompare(a.last?.at ?? a.at));
}

export const OVERDUE_HOURS = 24;

// Whose conversation this is: the rep it was sent to, or Heshy's own (no rep).
export function isMine(t: { staff_id: string | null }, me: { id: string | null; role: string }) {
  return t.staff_id ? t.staff_id === me.id : me.role === "admin";
}

export function waitingHours(t: ThreadRow, now: number) {
  return t.waiting && t.last ? (now - Date.parse(t.last.at)) / 36e5 : 0;
}

// An owner waiting more than a day: tell Heshy and the partners once per unanswered message.
export async function overdueAlerts(now = Date.now()) {
  const rows = (await listThreads(null)).filter((t) => t.staff_id && waitingHours(t, now) >= OVERDUE_HOURS);
  if (!rows.length) return { overdue: 0 };
  const { data: sent } = await db().from("activity_log").select("details").eq("action", "msg_overdue").gte("at", new Date(now - 30 * 864e5).toISOString());
  const done = new Set((sent ?? []).map((r) => String((r.details as Record<string, unknown>).msg ?? "")));
  const { data: partners } = await db().from("staff").select("email, is_partner, active").eq("is_partner", true).eq("active", true);
  let n = 0;
  for (const t of rows) {
    if (!t.last || done.has(t.last.id)) continue;
    const rep = await staffName(t.staff_id);
    const k = kit;
    const html = layout(
      k.big(`${k.esc(t.name)} has been waiting over a day for ${k.esc(rep.first)}`) +
        k.p(`About ${about(t)}. Their last message:`) +
        k.quote(t.last.text) +
        k.button(repLink(t.id), "See the conversation") +
        k.quiet(`It's ${k.esc(rep.first)}'s conversation. Check in with ${k.esc(rep.first)} first, or step in from the conversation page if needed.`),
    );
    const subject = `${t.name} has been waiting a day for ${rep.first}`;
    await emailAdmin(subject, html);
    for (const p of partners ?? []) if (p.email) await sendEmail({ to: p.email, subject, html, audience: "team" });
    await logActivity("system", "msg_overdue", { thread: t.id, msg: t.last.id });
    n++;
  }
  return { overdue: n };
}
