import { db } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { teamUrl } from "./format";
import { teamMembers } from "./teamRoom";

// One short Team Room summary a day (only on days something was posted).
export async function teamDigest() {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { data } = await db().from("activity_log").select("id, action, details").in("action", ["team_post", "team_reply"]).gte("at", since).order("at", { ascending: true });
  const rows = (data ?? []) as { id: number; action: string; details: Record<string, unknown> }[];
  const posts = rows.filter((r) => r.action === "team_post");
  const replies = rows.length - posts.length;
  if (!rows.length) return 0;
  const label: Record<string, string> = { spotlight: "⭐ Spotlight", looking: "🔎 Looking for", talk: "💬" };
  const lines = posts
    .slice(0, 6)
    .map((p) => `<li><strong>${escapeHtml(String(p.details.by_name ?? "Someone").split(" ")[0])}</strong> ${label[String(p.details.kind)] ?? ""}: ${escapeHtml(String(p.details.text ?? "").slice(0, 140))}${String(p.details.text ?? "").length > 140 ? "…" : ""}</li>`)
    .join("");
  const team = await teamMembers();
  for (const t of team)
    await sendEmail({
      to: t.email,
      subject: `Team Room today: ${posts.length} new post${posts.length === 1 ? "" : "s"}${replies ? `, ${replies} repl${replies === 1 ? "y" : "ies"}` : ""}`,
      html: `<p>Here&rsquo;s what&rsquo;s new in the Team Room.</p>${lines ? `<ul>${lines}</ul>` : ""}<p><a href="${teamUrl()}/admin/room">Open the Team Room</a></p>`,
    }).catch(() => null);
  return team.length;
}
