import { db } from "@/lib/db";
import { goldOf } from "@/lib/gold";
import { refCode, LEVEL_LABEL, WORK_MODE_LABEL } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { effectiveReps, repOptions } from "@/lib/reps";
import { releaseWaitingProfiles } from "@/lib/promise";
import { parseResult } from "@/lib/strengths";
import { backfillWorkingGenius } from "@/lib/readAssessment";
import { backfillStrengths } from "@/lib/strengthsBackfill";
import { after } from "next/server";
import { Board, type Row, type Start } from "./Board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse candidates" };

const VIEWS = ["applied", "draft", "listed", "paused", "hired", "archived"];

// Every candidate on the team, in one sortable, filterable view, so reps can scan
// for different kinds of people at a glance. Old links (?view=applied, ?gold=1,
// ?q=…) open it with the matching filters already on.
export default async function Browse({ searchParams }: PageProps<"/admin/candidates">) {
  const sp = await searchParams;
  const me = await requireStaff();
  await releaseWaitingProfiles();
  const admin = me.role === "admin";
  const { data, error } = await db()
    .from("candidates")
    .select(
      "id, status, full_name, email, headline, role_category, also_roles, industry, also_industries, level, location_region, work_mode, salary_min, salary_max, working_genius, assessment_path, created_at, listed_at, added_by, application",
    );
  const cands = (data ?? []) as unknown as {
    id: string;
    status: string;
    full_name: string;
    email: string;
    headline: string | null;
    role_category: string | null;
    also_roles: string[] | null;
    industry: string | null;
    also_industries: string[] | null;
    level: string | null;
    location_region: string | null;
    work_mode: string | null;
    salary_min: number | null;
    salary_max: number | null;
    working_genius: string | null;
    assessment_path: string | null;
    created_at: string;
    listed_at: string | null;
    added_by: string | null;
    application: Record<string, string> | null;
  }[];
  const [owners, options, { data: unlocks }] = await Promise.all([
    effectiveReps(cands),
    repOptions(),
    db().from("unlocks").select("candidate_id").not("confirmed_at", "is", null),
  ]);
  // Reports uploaded before results were read automatically: catch up a few at a time.
  after(() => backfillWorkingGenius(3).catch(() => null));
  after(() => backfillStrengths().catch(() => null));

  const interest = new Map<string, number>();
  for (const u of unlocks ?? []) interest.set(u.candidate_id as string, (interest.get(u.candidate_id as string) ?? 0) + 1);
  const repName = (id?: string) => (id ? (options.find(([x]) => x === id)?.[1] ?? "").split(" (")[0].split(" ")[0] || "Rep" : "");

  const rows: Row[] = cands.map((c) => {
    const l = parseResult(c.working_genius);
    const o = owners.get(c.id);
    const rep = o?.id;
    return {
      id: c.id,
      ref: refCode(c.id),
      name: c.full_name,
      email: c.email ?? "",
      repId: rep ?? "",
      repNote: o?.viaCall ? "from their call" : undefined,
      status: c.status,
      headline: c.headline,
      roles: [c.role_category, ...(c.also_roles ?? [])].filter((x): x is string => !!x?.trim()),
      industries: [c.industry, ...(c.also_industries ?? [])].filter((x): x is string => !!x?.trim()),
      level: c.level ? (LEVEL_LABEL[c.level] ?? c.level) : null,
      levelRank: c.level === "senior" ? 3 : c.level === "experienced" ? 2 : c.level === "beginner" ? 1 : 0,
      place: c.location_region?.trim() || null,
      mode: c.work_mode ? (WORK_MODE_LABEL[c.work_mode] ?? c.work_mode) : null,
      payMin: c.salary_min,
      payMax: c.salary_max,
      wg: l.length === 6 ? l.join("") : null,
      assessment: l.length === 6 ? "done" : c.assessment_path ? "uploaded" : "missing",
      available: c.application?.available ?? null,
      hours: c.application?.hours ?? null,
      rep: rep ? (rep === me.id ? "You" : repName(rep)) : null,
      mine: rep === me.id,
      gold: !!goldOf(c),
      interest: interest.get(c.id) ?? 0,
      added: c.created_at,
      listed: c.listed_at,
    };
  });

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const view = typeof sp.view === "string" && VIEWS.includes(sp.view) ? sp.view : null;
  const start: Start =
    q || sp.gold === "1"
      ? { status: [], q, gold: sp.gold === "1" }
      : { status: [view ?? (rows.some((r) => r.status === "applied") ? "applied" : "listed")], mine: sp.mine === "1" };
  if (!view && !q && sp.gold !== "1" && start.status[0] === "applied") start.status.push("listed");

  return (
    <>
      <div className="page-head">
        <h1>Browse candidates</h1>
        <p>Every candidate on the team. Sort, filter and group to spot the right kind of person fast.</p>
      </div>
      {typeof sp.deleted === "string" && (
        <p className="notice notice-good" role="status">
          {sp.deleted} was deleted.
        </p>
      )}
      {error && (
        <p className="notice notice-bad" role="alert">
          Couldn&rsquo;t load candidates: {error.message}
        </p>
      )}
      <Board key={JSON.stringify(start)} rows={rows} start={start} repOptions={admin ? options : null} />
    </>
  );
}
