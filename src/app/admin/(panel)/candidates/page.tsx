import Link from "next/link";
import { db } from "@/lib/db";
import { dateShort, refCode } from "@/lib/format";
import { requireStaff } from "@/lib/session";
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
  staff: { full_name: string | null; email: string } | null;
};

export default async function CandidatesList({ searchParams }: PageProps<"/admin/candidates">) {
  const sp = await searchParams;
  await requireStaff();
  const view = typeof sp.view === "string" && VIEWS.some(([v]) => v === sp.view) ? sp.view : "applied";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const { data, error } = await db()
    .from("candidates")
    .select("id, status, full_name, email, headline, role_category, created_at, listed_at, updated_at, staff(full_name, email)")
    .order("created_at", { ascending: false });
  const cands = (data ?? []) as unknown as CandRow[];
  const count = (s: string) => cands.filter((c) => c.status === s).length;
  const shown = cands.filter((c) =>
    q ? [c.full_name, c.email, c.headline, c.role_category, refCode(c.id)].join(" ").toLowerCase().includes(q) : c.status === view,
  );

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
                {q && <th>Status</th>}
                <th>Added by</th>
                <th>{view === "listed" && !q ? "Listed" : view === "hired" && !q ? "Hired" : "Added"}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/candidates/${c.id}`}>{c.full_name}</Link>
                    <div className="small muted">{c.email}</div>
                  </td>
                  <td>
                    {c.headline ?? <span className="muted">No profile yet</span>}
                    <div className="small muted">
                      {refCode(c.id)}
                      {c.role_category ? `, ${c.role_category}` : ""}
                    </div>
                  </td>
                  {q && (
                    <td>
                      <span className="tag">{c.status}</span>
                    </td>
                  )}
                  <td>{c.staff ? c.staff.full_name || c.staff.email : <span className="muted">Applied online</span>}</td>
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
