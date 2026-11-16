import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { matchesFor, positionsFor } from "@/lib/matching";
import { after } from "next/server";
import { judgePending } from "@/lib/matchJudge";
import { loadMatches } from "./data";
import { FitPill } from "./FitPill";
import { markNotAFit } from "./actions";
import styles from "./matches.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Matches" };

// Open positions we know about, and which candidates fit them. Private to the team.
export default async function MatchesPage({ searchParams }: PageProps<"/admin/matches">) {
  const me = await requireStaff();
  const sp = await searchParams;
  const { ready, positions, candidates, poolFor, isHidden, verdict } = await loadMatches(me);
  after(() => judgePending(4).catch(() => null));

  const perPosition = positions.map((p) => ({ p, ms: matchesFor(p, poolFor(p.id)) }));
  const perCandidate = candidates
    .map((c) => ({ c, best: positionsFor(c, positions.filter((p) => !isHidden(p.id, c.id)), 3) }))
    .filter((x) => x.best.length)
    .sort((a, b) => b.best[0].m.score - a.best[0].m.score);
  const top = (x: (typeof perCandidate)[number]) => verdict(x.best[0].p.id, x.c.id);
  const strong = perCandidate.filter((x) => (top(x)?.v === "strong" || top(x)?.v === "good" ? top(x)!.v : x.best[0].m.fit) === "strong" && top(x)?.v !== "paper").length;
  const noFit = perPosition.filter((x) => !x.ms.length).length;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Matches</h1>
          <p className="muted">Open positions we know about, and the candidates who fit them. Private: never shown on the site.</p>
        </div>
        {ready && (
          <Link className="btn btn-gold" href="/admin/matches/new">
            + Add a position
          </Link>
        )}
      </div>
      {sp.closed === "1" && <p className="notice notice-good">Closed. It no longer counts for matching.</p>}
      {!ready ? (
        <div className="panel panel-wash">
          <strong>One setup step left.</strong> The positions list needs its place in the database first. Heshy has the steps.
        </div>
      ) : (
        <>
          <div className={styles.nums}>
            <div>
              <b>{positions.length}</b>
              <span>open positions</span>
            </div>
            <div>
              <b>{strong}</b>
              <span>{me.manager ? "candidates" : "of your candidates"} with a strong fit</span>
            </div>
            <div>
              <b>{noFit}</b>
              <span>positions with no fit yet</span>
            </div>
          </div>
          <div className={styles.cols}>
            <section className={styles.box}>
              <h2>Open positions</h2>
              {perPosition.length ? (
                <ul className={styles.rows}>
                  {perPosition.map(({ p, ms }) => (
                    <li key={p.id}>
                      <Link prefetch={false} href={`/admin/matches/${p.id}`}>
                        <b>{p.title}</b>
                        <small>{[p.company, p.location].filter(Boolean).join(" · ") || " "}</small>
                      </Link>
                      {ms.length ? (
                        <span className={`tag ${ms[0].m.fit === "strong" ? "tag-good" : "tag-gold"}`}>{ms.length} fit</span>
                      ) : (
                        <span className="tag">No fit yet</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No open positions yet. Add the first one: paste a job post and the site fills it in.</p>
              )}
            </section>
            <section className={styles.box}>
              <h2>{me.manager ? "Candidates and what they fit" : "Your candidates and what they fit"}</h2>
              {perCandidate.length ? (
                <ul className={styles.rows}>
                  {perCandidate.slice(0, 40).map(({ c, best }) => (
                    <li key={c.id}>
                      <Link prefetch={false} href={`/admin/candidates/${c.id}`}>
                        <b>{c.full_name}</b>
                        <small>
                          {best[0].p.title}
                          {best[0].p.company ? ` at ${best[0].p.company}` : ""}
                          {best.length > 1 ? ` · +${best.length - 1} more` : ""}
                        </small>
                        {verdict(best[0].p.id, c.id)?.why && <small className={styles.aiWhy}>{verdict(best[0].p.id, c.id)!.why}</small>}
                      </Link>
                      <span className={styles.rowEnd}>
                        <FitPill fit={best[0].m.fit!} j={verdict(best[0].p.id, c.id)} />
                        <form action={markNotAFit.bind(null, best[0].p.id, c.id, true)}>
                          <button type="submit" className={styles.x} title={`Not a fit for ${best[0].p.title}`} aria-label={`${c.full_name} is not a fit for ${best[0].p.title}`}>
                            ✕
                          </button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No matches yet. They show up here as positions are added.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
