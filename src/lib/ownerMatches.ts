import { db, logActivity, type PublicCandidate } from "./db";
import { allListed } from "./catalog";
import { matchesFor, type Position } from "./matching";
import { positionsReady } from "./positions";
import { getSetting, setSetting } from "./settings";
import { sendEmail } from "./email";
import { siteUrl } from "./format";
import { signedToken } from "./session";

// Owners can tell us what they're hiring for. We quietly point out candidates who fit:
// a note on the site, and at most one email a week. Never pushy, always optional.

export async function ownerPositions(ownerId: string): Promise<Position[]> {
  if (!(await positionsReady())) return [];
  const { data } = await db().from("positions").select("*").eq("owner_id", ownerId).eq("status", "open").order("created_at", { ascending: false });
  return (data ?? []) as Position[];
}

// Candidates they've already signed for or passed on aren't suggested again.
async function alreadySeen(ownerId: string): Promise<Set<string>> {
  const { data } = await db().from("unlocks").select("candidate_id").eq("owner_id", ownerId);
  return new Set(((data ?? []) as { candidate_id: string }[]).map((r) => r.candidate_id));
}

const ownerWhy = (why: string[]) =>
  why
    .filter((w) => !/^(On-site|Hybrid|Remote|Flexible)$/.test(w))
    .map((w) => w.replace(/^Also a fit for /, "").replace(/ fits$/, " pay range").replace(/^Strong at /, ""))
    .slice(0, 3)
    .join(", ");

export type OwnerFit = { p: Position; list: { c: PublicCandidate; why: string; strong: boolean }[] };

export async function ownerFits(ownerId: string, max = 3): Promise<OwnerFit[]> {
  const positions = await ownerPositions(ownerId);
  if (!positions.length) return [];
  const [{ rows }, seen] = await Promise.all([allListed(), alreadySeen(ownerId)]);
  const pool = rows.filter((c) => !seen.has(c.id));
  return positions
    .map((p) => ({ p, list: matchesFor(p, pool, max).map(({ c, m }) => ({ c, why: ownerWhy(m.why), strong: m.fit === "strong" })) }))
    .filter((x) => x.list.length);
}

// ---- The weekly email ----

async function optedOut(): Promise<Set<string>> {
  return new Set(await getSetting<string[]>("owner_nudge_optout", []));
}
export async function optOutOwner(ownerId: string) {
  const all = await optedOut();
  all.add(ownerId);
  await setSetting("owner_nudge_optout", [...all]);
}

// From the daily run: owners with an open position get one email when a newly listed
// candidate is a strong fit. Never more than once a week per owner.
export async function sendOwnerNudges() {
  if (!(await positionsReady())) return { sent: 0 };
  const { data } = await db().from("positions").select("*").eq("status", "open").not("owner_id", "is", null);
  const positions = (data ?? []) as Position[];
  if (!positions.length) return { sent: 0 };
  const out = await optedOut();
  const { rows } = await allListed();
  const weekAgo = Date.now() - 7 * 864e5;
  const fresh = rows.filter((c) => c.listed_at && Date.parse(c.listed_at) > weekAgo);
  let sent = 0;
  const byOwner = new Map<string, Position[]>();
  for (const p of positions) if (p.owner_id && !out.has(p.owner_id)) byOwner.set(p.owner_id, [...(byOwner.get(p.owner_id) ?? []), p]);
  for (const [ownerId, ps] of byOwner) {
    const { count } = await db()
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "owner_match_email")
      .eq("details->>owner_id", ownerId)
      .gte("at", new Date(weekAgo).toISOString());
    if (count) continue;
    const seen = await alreadySeen(ownerId);
    const { data: prior } = await db().from("activity_log").select("details").eq("action", "owner_match_email").eq("details->>owner_id", ownerId);
    const told = new Set(((prior ?? []) as { details: { candidate_id?: string } }[]).map((r) => r.details.candidate_id));
    let best: { p: Position; c: PublicCandidate } | null = null;
    for (const p of ps) {
      const top = matchesFor(p, fresh.filter((c) => !seen.has(c.id) && !told.has(c.id)), 1)[0];
      if (top && top.m.fit === "strong") {
        best = { p, c: top.c };
        break;
      }
    }
    if (!best) continue;
    const { data: o } = await db().from("owners").select("email, full_name").eq("id", ownerId).maybeSingle();
    if (!o?.email) continue;
    const first = (o.full_name ?? "").split(" ")[0] || "there";
    const stop = `${siteUrl()}/account/stop-suggestions?t=${encodeURIComponent(signedToken(`ownerstop_${ownerId}`, 365))}`;
    await sendEmail({
      to: o.email,
      subject: `A new candidate may fit your ${best.p.title} opening`,
      html: `<p>Hi ${first},</p><p>A candidate who was just listed looks like a good fit for the ${best.p.title} role you're hiring for.</p>
<p><a href="${siteUrl()}/candidates/${best.c.id}" style="display:inline-block;background:#f2b300;color:#17213a;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Take a look</a></p>
<p style="font-size:13px;color:#6b7590">We only send these when there's a strong new fit, and never more than once a week. <a href="${stop}" style="color:#6b7590">Stop these emails</a>.</p>`,
    });
    await logActivity("system", "owner_match_email", { owner_id: ownerId, position_id: best.p.id, candidate_id: best.c.id });
    sent++;
  }
  return { sent };
}
