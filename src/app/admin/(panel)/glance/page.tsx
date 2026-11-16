import Link from "next/link";
import { after } from "next/server";
import { db } from "@/lib/db";
import { LEVEL_LABEL } from "@/lib/format";
import { backfillMemories, memoryOf } from "@/lib/memory";
import { clipOf } from "@/lib/clips";
import { effectiveReps, repOptions } from "@/lib/reps";
import { requireStaff } from "@/lib/session";
import { parseResult, TRAITS, type Letter } from "@/lib/strengths";
import { Cards, type Card } from "./Cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "At a glance" };

// Every candidate as a memory card, so a rep can scan them when a position
// opens and think "that's the one". Team only.
export default async function Glance({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const me = await requireStaff();
  const { all } = await searchParams;
  const { data } = await db()
    .from("candidates")
    .select("id, status, full_name, headline, highlights, role_category, also_roles, level, location_region, working_genius, created_at, added_by, application")
    .in("status", ["listed", "draft", "paused", "applied"])
    .order("created_at", { ascending: false });
  const cands = (data ?? []) as unknown as {
    id: string; status: string; full_name: string; headline: string | null; highlights: string[] | null; role_category: string | null; also_roles: string[] | null;
    level: string | null; location_region: string | null; working_genius: string | null; created_at: string; added_by: string | null; application: Record<string, string> | null;
  }[];
  const [owners, options] = await Promise.all([effectiveReps(cands), repOptions()]);
  after(() => backfillMemories(3).catch(() => null));
  const repName = (id?: string) => (id ? (options.find(([x]) => x === id)?.[1] ?? "").split(" (")[0].split(" ")[0] : "");
  const mineOnly = !all && !!me.id && cands.some((c) => owners.get(c.id)?.id === me.id);
  const cards: Card[] = cands
    .filter((c) => !mineOnly || owners.get(c.id)?.id === me.id)
    .map((c) => {
      const m = memoryOf(c);
      const l = parseResult(c.working_genius);
      const clip = clipOf(c.application);
      return {
        clip: clip ? { face: clip.face } : null,
        clipNote: me.manager && !clip ? (c.application?.clip_error ?? "") : "",
        id: c.id,
        name: c.full_name,
        meta: [[c.role_category, ...(c.also_roles ?? [])].filter(Boolean).slice(0, 2).join(" / "), c.location_region, c.level ? LEVEL_LABEL[c.level] : null].filter(Boolean).join(" · "),
        status: c.status,
        hook: m.hook,
        bullets: m.bullets,
        quote: m.quote,
        goodFor: m.good_for,
        strengths: l.length >= 6 ? l.slice(0, 2).map((x) => TRAITS[x as Letter].label) : [],
        rep: repName(owners.get(c.id)?.id),
        met: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    });
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", margin: "28px 0 6px" }}>
        <h1 style={{ margin: 0 }}>{mineOnly ? "My candidates, at a glance" : "Candidates at a glance"}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {me.id && (mineOnly ? <Link className="btn btn-small btn-ghost" href="/admin/glance?all=1">Show everyone</Link> : all ? <Link className="btn btn-small btn-ghost" href="/admin/glance">Show mine</Link> : null)}
          <Link className="btn btn-small btn-ghost" href="/admin/candidates">Table view</Link>
        </div>
      </div>
      <p className="muted" style={{ margin: "0 0 18px" }}>One line to remember each person by. Type a role or a word to narrow it down.</p>
      <Cards cards={cards} />
    </div>
  );
}
