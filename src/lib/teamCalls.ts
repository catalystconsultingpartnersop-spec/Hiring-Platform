import { db, logActivity } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { teamUrl } from "./format";
import { callIcs } from "./ics";
import { COMPANY_TZ, formatInZone } from "./time";
import { roomCandidates, teamMembers } from "./teamRoom";

// Team calls: scheduled from the Team Room. Each gets its own Google Meet link
// that records itself; afterwards the notes are written up, posted in the Team
// Room and emailed to everyone invited. Kept in the activity log.

export type TeamCall = { id: number; title: string; starts_at: string; minutes: number; invitees: string[]; link: string; space: string | null; by_name: string };
export type CallNotes = { id: number; at: string; call_id: number; title: string; bullets: string[]; actions: { who: string; what: string }[]; cands: string[]; failed?: boolean };

export async function teamCalls(): Promise<TeamCall[]> {
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data } = await db().from("activity_log").select("id, action, details").in("action", ["team_call", "team_call_cancelled"]).gte("at", since);
  const rows = (data ?? []) as { id: number; action: string; details: Record<string, unknown> }[];
  const gone = new Set(rows.filter((r) => r.action === "team_call_cancelled").map((r) => Number(r.details.call_id)));
  return rows
    .filter((r) => r.action === "team_call" && !gone.has(r.id))
    .map((r) => ({ id: r.id, ...(r.details as Omit<TeamCall, "id">) }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function allNotes(): Promise<CallNotes[]> {
  const { data } = await db().from("activity_log").select("id, at, details").eq("action", "team_call_notes").order("at", { ascending: false }).limit(20);
  return ((data ?? []) as { id: number; at: string; details: Record<string, unknown> }[]).map((r) => ({ id: r.id, at: r.at, ...(r.details as Omit<CallNotes, "id" | "at">) }));
}

export function nextCall(calls: TeamCall[], now: number) {
  return calls.find((c) => Date.parse(c.starts_at) + c.minutes * 60e3 > now) ?? null;
}

export function googleCalendarLink(c: TeamCall) {
  const st = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(Date.parse(c.starts_at) + c.minutes * 60e3).toISOString();
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: c.title, dates: `${st(c.starts_at)}/${st(end)}`, details: `Join: ${c.link}`, location: c.link })}`;
}

export async function scheduleTeamCall(me: { id: string | null; email: string; name: string }, o: { title: string; starts_at: string; minutes: number; invitees: string[] }) {
  const team = await teamMembers();
  const invited = team.filter((t) => o.invitees.includes(t.id) || t.email === me.email);
  const { newRecordedMeeting, addCohost } = await import("./googleCalls");
  const { callEmailFor } = await import("./callAccounts");
  let link = "";
  let space: string | null = null;
  try {
    const room = await newRecordedMeeting(me.id ? await callEmailFor({ id: me.id, email: me.email }) : null);
    if (room) {
      link = room.link;
      space = room.space;
      // Everyone invited can start the recording by joining.
      for (const t of invited) await addCohost(room.space, await callEmailFor({ id: t.id, email: t.email })).catch(() => null);
    }
  } catch (e) {
    console.error("team call room", e);
  }
  if (!link && me.id) {
    const { data } = await db().from("staff").select("meeting_link").eq("id", me.id).maybeSingle();
    link = (data?.meeting_link as string | null) ?? "";
  }
  if (!link) return { error: "We couldn't make a video link. Connect Google in Settings, or add your own video link on My hours." };
  const details = { title: o.title, starts_at: o.starts_at, minutes: o.minutes, invitees: invited.map((t) => t.id), link, space, by_name: me.name };
  await logActivity(`staff:${me.email}`, "team_call", details);
  const when = formatInZone(o.starts_at, COMPANY_TZ);
  const end = new Date(Date.parse(o.starts_at) + o.minutes * 60e3).toISOString();
  for (const t of invited)
    await sendEmail({
      to: t.email,
      subject: `Team call: ${when}`,
      html: `<p><strong>${escapeHtml(me.name)}</strong> set up a team call.</p><p style="font-size:18px"><strong>${escapeHtml(o.title)}</strong><br>${escapeHtml(when)} · ${o.minutes} minutes</p><p><a href="${escapeHtml(link)}">Join the call</a></p>${space ? `<p style="font-size:14px;color:#4a5570">It records itself. Afterwards we&rsquo;ll send everyone the notes.</p>` : ""}<p><a href="${teamUrl()}/admin/room">Open the Team Room</a></p>`,
      attachments: [{ filename: "team-call.ics", content: callIcs({ uid: `team-${o.starts_at}-${me.email}@candidate-collection`, start: o.starts_at, end, title: o.title, description: `Join: ${link}`, location: link }) }],
    }).catch(() => null);
  return { ok: true };
}

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5"];

// After a recorded team call: write up the notes, post them, email everyone invited.
export async function writeTeamCallNotes() {
  const key = process.env.ANTHROPIC_API_KEY;
  const now = Date.now();
  const [calls, notes] = await Promise.all([teamCalls(), allNotes()]);
  const done = new Set(notes.map((n) => n.call_id));
  const due = calls.filter((c) => c.space && !done.has(c.id) && Date.parse(c.starts_at) + c.minutes * 60e3 + 15 * 60e3 < now && Date.parse(c.starts_at) > now - 3 * 864e5);
  let wrote = 0;
  for (const c of due) {
    const { roomTranscript } = await import("./googleCalls");
    let transcript: string | null = null;
    try {
      transcript = await roomTranscript(c.space!);
    } catch {
      transcript = null;
    }
    if (!transcript) {
      // Give Google up to a day; then stop trying.
      if (Date.parse(c.starts_at) < now - 864e5) await logActivity("system", "team_call_notes", { call_id: c.id, title: c.title, bullets: [], actions: [], cands: [], failed: true });
      continue;
    }
    if (!key) continue;
    const prompt = `This is the transcript of a team call at a hiring company (reps who meet job candidates, and people who find business owners). Write short notes for the team.
Answer with JSON only: {"bullets":["3 to 6 short lines: what was discussed and decided"],"actions":[{"who":"first name","what":"short task"}],"candidates":["full names of any candidates discussed"]}
Plain, warm, short. No dollar amounts or commissions.

Transcript:
${transcript.slice(0, 80000)}`;
    let out: { bullets?: string[]; actions?: { who: string; what: string }[]; candidates?: string[] } | null = null;
    for (const model of MODELS) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      if (r.ok) {
        const j = (await r.json()) as { content: { text?: string }[] };
        const raw = j.content.map((x) => x.text ?? "").join("");
        try {
          out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        } catch {}
        break;
      }
      if (r.status !== 404 && r.status !== 400) break;
    }
    if (!out) continue;
    const people = await roomCandidates();
    const { data: full } = await db().from("candidates").select("id, full_name").in("id", people.map((p) => p.id));
    const names = (out.candidates ?? []).map((n) => n.toLowerCase().trim());
    const cands = ((full ?? []) as { id: string; full_name: string }[]).filter((p) => names.includes(p.full_name.toLowerCase().trim())).map((p) => p.id);
    const bullets = (out.bullets ?? []).slice(0, 8).map(String);
    const actions = (out.actions ?? []).slice(0, 10).map((a) => ({ who: String(a.who ?? ""), what: String(a.what ?? "") }));
    await logActivity("system", "team_call_notes", { call_id: c.id, title: c.title, bullets, actions, cands });
    wrote++;
    const team = await teamMembers();
    for (const t of team.filter((x) => c.invitees.includes(x.id)))
      await sendEmail({
        to: t.email,
        subject: `Notes from the team call: ${c.title}`,
        html: `<p>Here are the notes from <strong>${escapeHtml(c.title)}</strong> (${escapeHtml(formatInZone(c.starts_at, COMPANY_TZ))}).</p><ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>${actions.length ? `<p><strong>Who&rsquo;s doing what</strong></p><ul>${actions.map((a) => `<li><strong>${escapeHtml(a.who)}:</strong> ${escapeHtml(a.what)}</li>`).join("")}</ul>` : ""}<p><a href="${teamUrl()}/admin/room">Open the Team Room</a></p>`,
      }).catch(() => null);
  }
  return wrote;
}
