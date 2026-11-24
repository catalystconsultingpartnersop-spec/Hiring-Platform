import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { positionsFor } from "@/lib/matching";
import { after } from "next/server";
import { aiMatches, bestFor, matchStages, refreshMatches } from "@/lib/aiMatch";
import { manualMatches, openingProfiles, writePendingProfiles } from "@/lib/openings";
import { LEVEL_LABEL, WORK_MODE_LABEL, salaryRange } from "@/lib/format";
import { OpeningsBrowser, type OpeningRow } from "./OpeningsBrowser";
import { loadMatches } from "./data";
import { markNotAFit } from "./actions";
import styles from "./matches.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Openings" };
export const maxDuration = 300;

// Open positions we know about, and which candidates fit them. Private to the team.
export default async function MatchesPage({ searchParams }: PageProps<"/admin/matches">) {
  const me = await requireStaff();
  const sp = await searchParams;
  const { ready, positions, candidates, poolFor, isHidden } = await loadMatches(me);
  const store = await aiMatches();
  // Write up and match anything new or changed, right after the page answers.
  after(async () => {
    await writePendingProfiles(positions, 2).catch(() => null);
    await refreshMatches(positions, 2).catch(() => null);
  });

  const [profs, manual] = await Promise.all([openingProfiles(), manualMatches()]);
  const perPosition = positions.map((p) => {
    const ms = bestFor(p, poolFor(p.id), store);
    const pool = new Set(poolFor(p.id).map((c) => c.id));
    const hand = (manual[p.id] ?? []).filter((m) => pool.has(m.id) && !ms.some((x) => x.c.id === m.id));
    return { p, ms, hand };
  });
  const nameOf = new Map(candidates.map((c) => [c.id, c.full_name]));
  const rows: OpeningRow[] = perPosition.map(({ p, ms, hand }) => {
    const pr = profs[p.id];
    const lvl = p.level || pr?.level;
    return {
      id: p.id,
      title: p.title,
      company: p.company,
      place: p.location,
      role: pr?.role || p.role_category || "",
      tags: [pr?.role || p.role_category, lvl && (LEVEL_LABEL[lvl] ?? lvl), pr?.hours, salaryRange(p.salary_min, p.salary_max), p.work_mode && (WORK_MODE_LABEL[p.work_mode] ?? p.work_mode)].filter(Boolean) as string[],
      job: pr?.job || p.description || "",
      added: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      addedMs: Date.parse(p.created_at),
      matches: ms.length + hand.length,
      strong: ms.filter((x) => x.m.fit === "strong").length + hand.length,
      top: [...hand.map((h) => nameOf.get(h.id) ?? ""), ...ms.map((x) => x.c.full_name)].filter(Boolean).slice(0, 3),
    };
  });
  // Each candidate's best openings: the AI's picks where we have them.
  const perCandidate = candidates
    .map((c) => {
      const ai = positions
        .filter((p) => store[p.id] && !isHidden(p.id, c.id))
        .flatMap((p) => store[p.id].list.filter((x) => x.id === c.id).map((x) => ({ p, m: { score: x.fit === "strong" ? 2 : 1, fit: x.fit, why: [x.why] } })));
      const old = positionsFor(c, positions.filter((p) => !store[p.id] && !isHidden(p.id, c.id)), 3);
      return { c, best: [...ai, ...old].sort((a, b) => (b.m.fit === "strong" ? 1 : 0) - (a.m.fit === "strong" ? 1 : 0)).slice(0, 3) };
    })
    .filter((x) => x.best.length)
    .sort((a, b) => (b.best[0].m.fit === "strong" ? 1 : 0) - (a.best[0].m.fit === "strong" ? 1 : 0));
  const strong = perCandidate.filter((x) => x.best[0].m.fit === "strong").length;
  const noFit = perPosition.filter((x) => !x.ms.length).length;
  // Sent matches waiting on the owner for 3+ days: time for a friendly follow-up.
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const waiting = (
    await Promise.all(
      positions.map(async (p) => [...(await matchStages(p)).entries()].filter(([cid, st]) => st.stale && byId.has(cid)).map(([cid, st]) => ({ p, c: byId.get(cid)!, st }))),
    )
  ).flat();

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Openings</h1>
          <p className="muted">Jobs we know about, written up, and the candidates who fit them. Private: never shown on the site.</p>
        </div>
        {ready && (
          <Link className="btn btn-gold" href="/admin/matches/new">
            + Add an opening
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
              <span>open jobs</span>
            </div>
            <div>
              <b>{strong}</b>
              <span>{me.manager ? "candidates" : "of your candidates"} with a strong fit</span>
            </div>
            <div>
              <b>{noFit}</b>
              <span>openings with no fit yet</span>
            </div>
          </div>
          {waiting.length > 0 && (
            <section className={styles.box} style={{ background: "#fff8e1", borderColor: "#f0d77a" }}>
              <h2>Waiting on the owner</h2>
              <ul className={styles.rows}>
                {waiting.map(({ p, c, st }) => (
                  <li key={p.id + c.id}>
                    <Link prefetch={false} href={`/admin/matches/${p.id}`}>
                      <b>
                        {c.full_name} for {p.title}
                      </b>
                      <small>{st.stage === "opened" ? "The owner opened it, then nothing." : "Sent, not opened yet."} A friendly follow-up is due.</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {rows.length ? (
            <OpeningsBrowser rows={rows} mine={!me.manager} />
          ) : (
            <p className="muted small">No openings yet. Add the first one: paste a job post, or just type or say one line.</p>
          )}
          <div className={styles.cols}>
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
                        <small className={styles.aiWhy}>{best[0].m.why[0]}</small>
                      </Link>
                      <span className={styles.rowEnd}>
                        <span className={`tag ${best[0].m.fit === "strong" ? "tag-good" : "tag-gold"}`}>{best[0].m.fit === "strong" ? "Strong" : "Good"}</span>
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
                <p className="muted small">No matches yet. They show up here as openings are added.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
