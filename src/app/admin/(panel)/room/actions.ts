"use server";

import { revalidatePath } from "next/cache";
import { db, logActivity } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { teamUrl } from "@/lib/format";
import { requireStaff, staffActor } from "@/lib/session";
import { setSetting } from "@/lib/settings";
import { allow, SLOW_DOWN } from "@/lib/throttle";
import { after } from "next/server";
import { emailNewPost, emailReply, setRoomEmail, type RoomEmail } from "@/lib/roomNotify";
import { codesIn, roomCandidates, specialties, teamMembers, type Kind, type Specialty } from "@/lib/teamRoom";

export type RoomState = { error?: string; ok?: boolean };

const KINDS: Kind[] = ["spotlight", "looking", "talk"];

async function candIds(form: FormData, text: string) {
  const picked = String(form.get("cands") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  const codes = codesIn(text);
  if (!codes.length) return [...new Set(picked)].slice(0, 6);
  const all = await roomCandidates();
  const fromCodes = all.filter((c) => codes.some((k) => c.id.replace(/-/g, "").endsWith(k))).map((c) => c.id);
  return [...new Set([...picked, ...fromCodes])].slice(0, 6);
}

// @Name tags: a short email to whoever was tagged.
async function notifyTagged(text: string, me: { email: string; name: string }, link: string): Promise<string[]> {
  const team = await teamMembers();
  const tagged = team.filter((t) => t.email !== me.email && new RegExp(`@${t.name.split(" ")[0]}\\b`, "i").test(text));
  for (const t of tagged)
    await sendEmail({
      to: t.email,
      subject: `${me.name.split(" ")[0]} mentioned you in the Team Room`,
      html: `<p><strong>${escapeHtml(me.name)}</strong> mentioned you:</p><blockquote style="border-left:3px solid #f2b300;margin:0;padding:6px 12px">${escapeHtml(text.slice(0, 600))}</blockquote><p><a href="${link}">Open the Team Room</a></p>`,
    }).catch(() => null);
  return tagged.map((t) => t.email.toLowerCase());
}

export async function postToRoom(_prev: RoomState, form: FormData): Promise<RoomState> {
  const me = await requireStaff();
  const kind = KINDS.includes(form.get("kind") as Kind) ? (form.get("kind") as Kind) : "talk";
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  if (!text) return { error: "Write a line or two first." };
  if (!(await allow(`room:${me.email}`, 30, 60))) return { error: SLOW_DOWN };
  const cands = await candIds(form, text);
  if (kind === "spotlight" && !cands.length) return { error: "Attach the candidate you're spotlighting." };
  await logActivity(staffActor(me), "team_post", { kind, text, cands, by_name: me.name, by_id: me.id });
  const tagged = await notifyTagged(text, me, `${teamUrl()}/admin/room`);
  // Let the team know right away (each person can switch to replies and tags only).
  const { data: mine } = await db().from("activity_log").select("id").eq("action", "team_post").eq("actor", staffActor(me)).order("at", { ascending: false }).limit(1);
  after(() =>
    emailNewPost({ postId: (mine?.[0]?.id as number | undefined) ?? null, kind, text, by: { email: me.email, name: me.name || me.email }, tagged, link: `${teamUrl()}/admin/room` }).catch(() => null),
  );
  revalidatePath("/admin/room");
  return { ok: true };
}

export async function replyToPost(postId: number, _prev: RoomState, form: FormData): Promise<RoomState> {
  const me = await requireStaff();
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  const cands = await candIds(form, text);
  if (!text && !cands.length) return { error: "Write a reply or attach a candidate." };
  if (!(await allow(`room:${me.email}`, 30, 60))) return { error: SLOW_DOWN };
  const { data: post } = await db().from("activity_log").select("id, actor, details").eq("id", postId).eq("action", "team_post").maybeSingle();
  if (!post) return { error: "That post isn't there anymore." };
  await logActivity(staffActor(me), "team_reply", { post_id: postId, text, cands, by_name: me.name, by_id: me.id });
  const author = String(post.actor).replace(/^staff:/, "");
  const link = `${teamUrl()}/admin/room#p${postId}`;
  const tagged = await notifyTagged(text, me, link);
  // The person who posted, plus everyone else already in the conversation.
  after(() => emailReply({ postId, postAuthor: author, text, cands: cands.length, by: { email: me.email, name: me.name || me.email }, tagged, link }).catch(() => null));
  revalidatePath("/admin/room");
  return { ok: true };
}

export async function removePost(postId: number) {
  const me = await requireStaff();
  const { data: post } = await db().from("activity_log").select("actor").eq("id", postId).eq("action", "team_post").maybeSingle();
  if (!post) return;
  if (!me.manager && String(post.actor) !== staffActor(me)) return;
  await logActivity(staffActor(me), "team_post_removed", { post_id: postId });
  revalidatePath("/admin/room");
}

export async function setSpecialty(form: FormData) {
  const me = await requireStaff();
  if (!me.id) return;
  const v = String(form.get("specialty") ?? "");
  const cur = await specialties();
  if (v === "candidates" || v === "owners" || v === "both") cur[me.id] = v as Specialty;
  else delete cur[me.id];
  await setSetting("rep_specialty", cur);
  revalidatePath("/admin/room");
}

// ---------- Team calls ----------

export async function scheduleCall(_prev: RoomState, form: FormData): Promise<RoomState> {
  const me = await requireStaff();
  const { zonedToUtc, validTimeZone } = await import("@/lib/time");
  const tz = validTimeZone(String(form.get("tz") ?? ""));
  const day = String(form.get("day") ?? "");
  const time = String(form.get("time") ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return { error: "Pick the day and time." };
  const starts = new Date(zonedToUtc(+m[1], +m[2], +m[3], +t[1] * 60 + +t[2], tz)).toISOString();
  if (Date.parse(starts) < Date.now() - 5 * 60e3) return { error: "That time has passed." };
  const minutes = Math.min(120, Math.max(15, Number(form.get("minutes")) || 30));
  const title = String(form.get("title") ?? "").trim().slice(0, 80) || "Team call";
  const invitees = form.getAll("invite").map(String);
  if (!(await allow(`teamcall:${me.email}`, 10, 60))) return { error: SLOW_DOWN };
  const { scheduleTeamCall } = await import("@/lib/teamCalls");
  const r = await scheduleTeamCall(me, { title, starts_at: starts, minutes, invitees });
  if ("error" in r && r.error) return { error: r.error };
  revalidatePath("/admin/room");
  return { ok: true };
}

export async function cancelTeamCall(callId: number) {
  const me = await requireStaff();
  const { data } = await db().from("activity_log").select("actor").eq("id", callId).eq("action", "team_call").maybeSingle();
  if (!data) return;
  if (!me.manager && String(data.actor) !== staffActor(me)) return;
  await logActivity(staffActor(me), "team_call_cancelled", { call_id: callId });
  revalidatePath("/admin/room");
}

export async function setRoomEmailPref(form: FormData) {
  const me = await requireStaff();
  const v = String(form.get("room_email") ?? "all");
  await setRoomEmail(me.email, (v === "mine" ? "mine" : "all") as RoomEmail);
  revalidatePath("/admin/room");
}
