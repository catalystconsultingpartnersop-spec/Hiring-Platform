import { db } from "./db";
import { goldOf } from "./gold";
import { refCode } from "./format";
import { getSetting } from "./settings";
import { isCheckAccount } from "./session";

// The Team Room: a bulletin board for the team. Posts and replies are kept in
// the activity log (no separate table needed). Hires and new gold candidates
// show up on their own.

export type Kind = "spotlight" | "looking" | "talk";
export type RoomCand = { id: string; first: string; headline: string; sub: string; gold: boolean; repId: string | null; repFirst: string; role: string; place: string; status: string };
export type RoomReply = { id: number; at: string; byName: string; byEmail: string; text: string; cands: string[]; edited?: boolean };
export type RoomPost = {
  id: number;
  at: string;
  kind: Kind | "auto_hire" | "auto_gold" | "auto_notes";
  byName: string;
  byEmail: string;
  text: string;
  cands: string[];
  replies: RoomReply[];
  edited?: boolean;
};
export type Specialty = "candidates" | "owners" | "both";
export const SPECIALTY_LABEL: Record<Specialty, string> = { candidates: "Candidates", owners: "Business owners", both: "Both" };

const CODE = /\bC-([0-9A-F]{6})\b/gi;

export function codesIn(text: string) {
  return [...text.matchAll(CODE)].map((m) => m[1].toLowerCase());
}

type CandRow = { id: string; full_name: string; headline: string | null; role_category: string | null; location_region: string | null; status: string; added_by: string | null; application: Record<string, unknown> | null };

export async function roomCandidates(): Promise<RoomCand[]> {
  const [{ data }, { data: staff }] = await Promise.all([
    db().from("candidates").select("id, full_name, headline, role_category, location_region, status, added_by, application").in("status", ["listed", "applied", "draft", "paused", "hired"]),
    db().from("staff").select("id, full_name, email"),
  ]);
  const names = new Map(((staff ?? []) as { id: string; full_name: string | null; email: string }[]).map((s) => [s.id, (s.full_name || s.email).split(" ")[0]]));
  return ((data ?? []) as CandRow[]).map((c) => ({
    id: c.id,
    first: c.full_name.split(" ")[0],
    headline: c.headline || c.role_category || "Profile in progress",
    sub: [refCode(c.id), c.role_category, c.location_region].filter(Boolean).join(" · "),
    gold: !!goldOf(c),
    repId: c.added_by,
    repFirst: c.added_by ? (names.get(c.added_by) ?? "") : "",
    role: c.role_category ?? "",
    place: c.location_region ?? "",
    status: c.status,
  }));
}

export async function loadRoom(): Promise<RoomPost[]> {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data } = await db()
    .from("activity_log")
    .select("id, at, actor, action, details")
    .in("action", ["team_post", "team_reply", "team_post_removed", "team_reply_removed", "team_edit", "gold_on"])
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(600);
  type Row = { id: number; at: string; actor: string; action: string; details: Record<string, unknown> };
  const rows = (data ?? []) as Row[];
  const removed = new Set(rows.filter((r) => r.action === "team_post_removed").map((r) => Number(r.details.post_id)));
  const removedReplies = new Set(rows.filter((r) => r.action === "team_reply_removed").map((r) => Number(r.details.reply_id)));
  // Edits: rows come newest first, so the first one seen for an id is the latest.
  const edits = new Map<number, string>();
  for (const r of rows) if (r.action === "team_edit" && !edits.has(Number(r.details.id))) edits.set(Number(r.details.id), String(r.details.text ?? ""));
  const textOf = (r: Row) => edits.get(r.id) ?? String(r.details.text ?? "");
  const email = (a: string) => a.replace(/^staff:/, "");
  const posts: RoomPost[] = rows
    .filter((r) => r.action === "team_post" && !removed.has(r.id))
    .map((r) => ({
      id: r.id,
      at: r.at,
      kind: (r.details.kind as Kind) ?? "talk",
      byName: String(r.details.by_name ?? email(r.actor)),
      byEmail: email(r.actor),
      text: textOf(r),
      edited: edits.has(r.id),
      cands: (r.details.cands as string[]) ?? [],
      replies: [],
    }));
  const byId = new Map(posts.map((p) => [p.id, p]));
  for (const r of [...rows].reverse()) {
    if (r.action !== "team_reply" || removedReplies.has(r.id)) continue;
    const p = byId.get(Number(r.details.post_id));
    if (p) p.replies.push({ id: r.id, at: r.at, byName: String(r.details.by_name ?? email(r.actor)), byEmail: email(r.actor), text: textOf(r), edited: edits.has(r.id), cands: (r.details.cands as string[]) ?? [] });
  }
  // New gold candidates, posted on their own.
  for (const r of rows.filter((x) => x.action === "gold_on")) {
    const { data: c } = await db().from("candidates").select("application, status").eq("id", String(r.details.candidate_id)).maybeSingle();
    const g = c ? goldOf(c as { status: string; application: Record<string, unknown> | null }) : null;
    if (!g) continue;
    posts.push({ id: -r.id, at: r.at, kind: "auto_gold", byName: g.by_name, byEmail: "", text: g.why ?? "", cands: [String(r.details.candidate_id)], replies: [] });
  }
  // Hires, celebrated.
  const { data: hires } = await db()
    .from("hires")
    .select("id, paid_at, status, unlocks(candidate_id, owners(company))")
    .in("status", ["paid", "hired"])
    .gte("paid_at", since);
  for (const h of (hires ?? []) as unknown as { id: string; paid_at: string; unlocks: { candidate_id: string; owners: { company: string | null } | null } | null }[]) {
    if (!h.unlocks) continue;
    posts.push({ id: -1e12 - posts.length, at: h.paid_at, kind: "auto_hire", byName: "", byEmail: "", text: h.unlocks.owners?.company ?? "", cands: [h.unlocks.candidate_id], replies: [] });
  }
  return posts.sort((a, b) => b.at.localeCompare(a.at));
}

export async function specialties(): Promise<Record<string, Specialty>> {
  return getSetting<Record<string, Specialty>>("rep_specialty", {});
}

export async function teamMembers() {
  const { data } = await db().from("staff").select("id, full_name, email, active, role, agreement_signed_at").eq("active", true);
  return ((data ?? []) as { id: string; full_name: string | null; email: string; role: string; agreement_signed_at: string | null }[])
    .filter((s) => !isCheckAccount(s.email) && (s.role === "admin" || !!s.agreement_signed_at))
    .map((s) => ({ id: s.id, name: s.full_name || s.email, email: s.email }));
}
