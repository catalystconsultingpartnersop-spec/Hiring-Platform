import { db } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { getSetting, setSetting } from "./settings";
import { teamMembers } from "./teamRoom";

// Team Room notifications: emails when something new is posted, and the unread
// count on the menu. Kept in app_settings (no new tables).

export type RoomEmail = "all" | "mine"; // every new post, or only replies to my posts and tags
const PREFS = "room_email";
const SEEN = "room_seen";

export async function roomEmailPrefs() {
  return getSetting<Record<string, RoomEmail>>(PREFS, {});
}

export async function setRoomEmail(email: string, v: RoomEmail) {
  const cur = await roomEmailPrefs();
  if (v === "all") delete cur[email.toLowerCase()];
  else cur[email.toLowerCase()] = v;
  await setSetting(PREFS, cur);
}

const quote = (t: string) =>
  `<blockquote style="border-left:3px solid #f2b300;margin:0 0 14px;padding:6px 12px">${escapeHtml(t.slice(0, 600)).replace(/\n/g, "<br>")}</blockquote>`;

const LABEL: Record<string, string> = { spotlight: "spotlighted a candidate", looking: "is looking for someone", talk: "posted" };

// A new post: everyone on the team hears right away (unless they chose replies and tags only).
// People tagged in it get the "mentioned you" email instead, so nobody gets two.
export async function emailNewPost(o: { postId: number | null; kind: string; text: string; by: { email: string; name: string }; tagged: string[]; link: string }) {
  const [team, prefs] = await Promise.all([teamMembers(), roomEmailPrefs()]);
  const first = o.by.name.split(" ")[0];
  const link = o.postId ? `${o.link}#p${o.postId}` : o.link;
  for (const t of team) {
    const e = t.email.toLowerCase();
    if (e === o.by.email.toLowerCase() || o.tagged.includes(e) || prefs[e] === "mine") continue;
    await sendEmail({
      to: t.email,
      subject: `${first} ${LABEL[o.kind] ?? "posted"} in the Team Room`,
      audience: "team",
      html: `<p>Hi ${escapeHtml(t.name.split(" ")[0])},</p><p><strong>${escapeHtml(o.by.name)}</strong> ${LABEL[o.kind] ?? "posted"} in the Team Room:</p>${quote(o.text)}<p><a href="${link}">Open it and reply</a></p><p style="font-size:12px;color:#8a93a8">Too many emails? In the Team Room you can choose to hear only about replies to your posts and when you're tagged.</p>`,
    }).catch(() => null);
  }
}

// A reply: the person who posted and everyone else who replied in that thread.
export async function emailReply(o: { postId: number; postAuthor: string; text: string; cands: number; by: { email: string; name: string }; tagged: string[]; link: string }) {
  const { data } = await db().from("activity_log").select("actor").eq("action", "team_reply").eq("details->>post_id", String(o.postId));
  const people = new Set([o.postAuthor, ...((data ?? []) as { actor: string }[]).map((r) => String(r.actor).replace(/^staff:/, ""))].map((e) => e.toLowerCase()));
  const team = await teamMembers();
  for (const e of people) {
    if (!e.includes("@") || e === o.by.email.toLowerCase() || o.tagged.includes(e)) continue;
    const t = team.find((m) => m.email.toLowerCase() === e);
    const yours = e === o.postAuthor.toLowerCase();
    await sendEmail({
      to: t?.email ?? e,
      subject: `${o.by.name.split(" ")[0]} replied ${yours ? "to your post" : "in a conversation you're in"}`,
      audience: "team",
      html: `<p><strong>${escapeHtml(o.by.name)}</strong> replied in the Team Room${o.cands ? ` and attached ${o.cands === 1 ? "a candidate" : `${o.cands} candidates`}` : ""}:</p>${o.text ? quote(o.text) : ""}<p><a href="${o.link}">See the reply</a></p>`,
    }).catch(() => null);
  }
}

// ---------- Unread ----------

export async function markRoomSeen(email: string) {
  const cur = await getSetting<Record<string, string>>(SEEN, {});
  cur[email.toLowerCase()] = new Date().toISOString();
  await setSetting(SEEN, cur);
}

// New posts and replies from others since this person last opened the Team Room.
export async function roomUnread(email: string) {
  const seen = (await getSetting<Record<string, string>>(SEEN, {}))[email.toLowerCase()];
  const since = seen ?? new Date(Date.now() - 7 * 864e5).toISOString();
  const { count } = await db()
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .in("action", ["team_post", "team_reply"])
    .gt("at", since)
    .neq("actor", `staff:${email}`);
  return count ?? 0;
}
