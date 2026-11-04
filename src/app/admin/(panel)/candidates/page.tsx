import Link from "next/link";
import { db } from "@/lib/db";
import { dateShort, refCode } from "@/lib/format";

import { requireStaff } from "@/lib/session";
import { releaseWaitingProfiles } from "@/lib/promise";
import { effectiveReps, repOptions } from "@/lib/reps";
import { after } from "next/server";
import { backfillWorkingGenius } from "@/lib/readAssessment";
import { backfillStrengths } from "@/lib/strengthsBackfill";
import { RepPicker } from "./RepPicker";
import { WGChips } from "./WGChips";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const VIEWS = [
  ["applied", "New applications"],
  ["draft", "Drafts"],
  ["listed", "Listed"],
  ["paused", "Paused"],
  ["hired", "Hired"],
  ["archived", "Archived"],
] as const;

type CandRow = {
  id: string;
  status: string;
  full_name: string;
  email: string;
  headline: string | null;
  role_category: string | null;
  created_at: string;
  listed_at: string | null;
  updated_at: string;
  added_by: string | null;
  working_genius: string | null;
  assessment_path: string | null;
  application: Record<string, string> | null;
  staff: { full_name: string | null; email: string } | null;
};

export default async function CandidatesList({ searchParams }: PageProps<"/admin/candidates">) {
  const sp = await searchParams;
  const me = await requireStaff();
  await releaseWaitingProfiles();
  const admin = me.role === "admin";
  const view = typeof sp.view === "string" && VIEWS.some(([v]) => v === sp.view) ? sp.view : "applied";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const { data, error } = await db()
    .from("candidates")
    .select("id, status, full_name, email, headline, role_category, created_at, listed_at, updated_at, added_by, working_genius, assessment_path, application, staff(full_name, email)")
    .order("created_at", { ascending: false });
  let cands = (data ?? []) as unknown as CandRow[];
  // Regular reps see only their own candidates (Heshy, admins and partners see everyone).
  if (!me.manager) {
    const owner = await effectiveReps(cands);
    cands = cands.filter((c) => owner.get(c.id)?.id === me.id);
  }
  const count = (s: string) => cands.filter((c) => c.status === s).length;
  const shown = cands.filter((c) =>
    q ? [c.full_name, c.email, c.headline, c.role_category, refCode(c.id)].join(" ").toLowerCase().includes(q) : c.status === view,
  );
  const [options, reps] = admin ? await Promise.all([repOptions(), effectiveReps(shown)]) : [[], new Map()];
  // Reports uploaded before results were read automatically: catch up a few at a time.
  after(() => backfillWorkingGenius(3).catch(() => null));
  after(() => backfillStrengths().catch(() => null));

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <h1>Candidates</h1>
        <form style={{ display: "flex", gap: 8 }}>
          <input className="input" name="q" defaultValue={q} placeholder="Search name, email, ref…" style={{ minWidth: 240 }} />
          <button className="btn btn-small" type="submit">
            Search
          </button>
        </form>
      </div>
      {typeof sp.deleted === "string" && (
        <p className="notice notice-good" role="status">
          {sp.deleted} was deleted.
        </p>
      )}
      {sp.password === "set" && (
        <p className="notice notice-good" role="status">
          Password saved. Next time, sign in with your email and password.
        </p>
      )}
      {error && (
        <p className="notice notice-bad" role="alert">
          Couldn&rsquo;t load candidates: {error.message}
        </p>
      )}
      <div className={styles.tabs}>
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={`/admin/candidates?view=${v}`} aria-current={!q && v === view ? "page" : undefined}>
            {label} ({count(v)})
          </Link>
        ))}
      </div>
      {q && <p className="small muted">Search results for &ldquo;{q}&rdquo; across all statuses. <Link href="/admin/candidates">Clear</Link></p>}
      {shown.length === 0 ? (
        <p className="panel panel-wash">
          No one here. <Link href="/admin/candidates/new">Add a candidate</Link>
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Profile</th>
                <th title="Green: natural strengths. Yellow: can do well. Red: wears them down.">Strengths</th>
                {q && <th>Status</th>}
                <th>Rep</th>
                <th>{view === "listed" && !q ? "Listed" : view === "hired" && !q ? "Hired" : "Added"}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link prefetch={false} href={`/admin/candidates/${c.id}`}>{c.full_name}</Link>
                    <div className="small muted">{c.email}</div>
                  </td>
                  <td>
                    {c.headline ?? <span className="muted">No profile yet</span>}
                    <div className="small muted">
                      {refCode(c.id)}
                      {c.role_category ? `, ${c.role_category}` : ""}
                    </div>
                  </td>
                  <td>
                    <WGChips result={c.working_genius} uploaded={!!c.assessment_path} tried={!!c.application?.wg_read_at} />
                  </td>
                  {q && (
                    <td>
                      <span className="tag">{c.status}</span>
                    </td>
                  )}
                  <td>
                    {admin ? (
                      <RepPicker
                        candidateId={c.id}
                        value={reps.get(c.id)?.id ?? ""}
                        options={options}
                        note={reps.get(c.id)?.viaCall ? "from their call" : undefined}
                      />
                    ) : c.staff ? (
                      c.staff.full_name || c.staff.email
                    ) : (
                      <span className="muted">Applied online</span>
                    )}
                  </td>
                  <td>{dateShort(view === "listed" && !q ? c.listed_at : view === "hired" && !q ? c.updated_at : c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
