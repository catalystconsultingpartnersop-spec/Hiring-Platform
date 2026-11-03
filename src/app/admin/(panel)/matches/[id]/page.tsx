import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { matchesFor } from "@/lib/matching";
import { getPosition, POSITION_FIELDS, type PositionDraft } from "@/lib/positions";
import { LEVEL_LABEL, WORK_MODE_LABEL, salaryRange } from "@/lib/format";
import { loadMatches } from "../data";
import { FitPill } from "../FitPill";
import { PositionForm } from "../PositionForm";
import { setPositionStatus } from "../actions";
import styles from "../matches.module.css";

export const dynamic = "force-dynamic";

export default async function PositionPage({ params, searchParams }: PageProps<"/admin/matches/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireStaff();
  const p = await getPosition(id);
  if (!p) notFound();
  const { candidates } = await loadMatches(me);
  const ms = matchesFor(p, candidates, 15);
  const facts: [string, string | null][] = [
    ["Company", p.company],
    ["Location", [p.location, p.work_mode ? WORK_MODE_LABEL[p.work_mode] ?? p.work_mode : null].filter(Boolean).join(" · ") || null],
    ["Pay", salaryRange(p.salary_min, p.salary_max)],
    ["Level", p.level ? LEVEL_LABEL[p.level] ?? p.level : null],
    ["Start", p.starts],
    ["Needs most", p.needs],
  ];
  const start = Object.fromEntries(POSITION_FIELDS.map((f) => [f, p[f] == null ? "" : String(p[f])])) as PositionDraft;

  return (
    <div className={styles.page}>
      <Link href="/admin/matches" className="small muted">
        Matches
      </Link>
      <div className={styles.head}>
        <div>
          <h1>{p.title}</h1>
          <p className="muted">
            {p.status === "closed" ? "Closed · " : ""}Added {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {p.url && (
              <>
                {" · "}
                <a href={p.url} target="_blank" rel="noreferrer">
                  The post
                </a>
              </>
            )}
          </p>
        </div>
        <form action={setPositionStatus.bind(null, p.id, p.status === "closed" ? "open" : "closed")}>
          <button className="btn btn-ghost btn-small" type="submit">
            {p.status === "closed" ? "Reopen" : "Filled or closed"}
          </button>
        </form>
      </div>
      {sp.saved === "1" && <p className="notice notice-good">Saved.</p>}
      <div className={styles.facts}>
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              {v}
            </div>
          ))}
      </div>
      <section className={styles.box}>
        <h2>{me.manager ? "Best matches" : "Your candidates who fit"}</h2>
        {ms.length ? (
          ms.map(({ c, m }) => (
            <div key={c.id} className={styles.match}>
              <FitPill fit={m.fit!} />
              <div>
                <Link prefetch={false} href={`/admin/candidates/${c.id}`}>
                  <b>{c.full_name}</b>
                </Link>
                <div className={styles.why}>{m.why.join(" · ")}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="muted small">No listed candidate fits this one yet. New candidates are checked automatically.</p>
        )}
      </section>
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Edit this position</summary>
        <div style={{ marginTop: 12 }}>
          <PositionForm id={p.id} start={start} />
        </div>
      </details>
    </div>
  );
}
