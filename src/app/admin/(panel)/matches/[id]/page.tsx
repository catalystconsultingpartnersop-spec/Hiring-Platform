import { after } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { getPosition, POSITION_FIELDS, type PositionDraft } from "@/lib/positions";
import { LEVEL_LABEL, WORK_MODE_LABEL, salaryRange } from "@/lib/format";
import { aiMatches, bestFor, matchPool, matchStages, type Stage } from "@/lib/aiMatch";
import { companyCard, openingProfile, profileSig, writeOpeningProfile } from "@/lib/openings";
import { effectiveReps } from "@/lib/reps";
import { db } from "@/lib/db";
import { loadMatches } from "../data";
import { PositionForm } from "../PositionForm";
import { SendToOwner } from "../SendToOwner";
import { addNote, markNotAFit, rematch, saveCompanyCard, setPositionStatus } from "../actions";
import styles from "../matches.module.css";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STAGE: Record<Stage["stage"], string> = { sent: "Sent", opened: "Owner opened it", unlocked: "Owner unlocked", meeting: "Meeting", hired: "Hired" };
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

export default async function OpeningPage({ params, searchParams }: PageProps<"/admin/matches/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireStaff();
  const p = await getPosition(id);
  if (!p) notFound();
  const [{ poolFor, removedFor, candidates }, prof, store, card, stages] = await Promise.all([loadMatches(me), openingProfile(p.id), aiMatches(), companyCard(p.company), matchStages(p)]);
  const ai = store[p.id];
  // Missing or out of date: write it up (and match) right after this page answers.
  const stale = !prof?.job || prof.sig !== profileSig(p, prof.notes ?? []);
  if (stale || !ai)
    after(async () => {
      if (stale) await writeOpeningProfile(p).catch(() => null);
      await (await import("@/lib/aiMatch")).runMatch(p).catch(() => null);
    });
  const ms = bestFor(p, poolFor(p.id), store, 8);
  const removed = removedFor(p.id);
  const reps = await effectiveReps(candidates.map((c) => ({ id: c.id, added_by: c.added_by })));
  const { data: staff } = await db().from("staff").select("id, full_name");
  const repName = (cid: string) => ((staff ?? []).find((s) => s.id === reps.get(cid)?.id)?.full_name ?? "").split(" ")[0];
  // "Almost": not listed yet, but would fit once their profile is finished (yours only, for reps).
  const mine = new Set(candidates.map((c) => c.id));
  const pool = ai?.almost?.length ? await matchPool() : null;
  const unlisted = new Map((pool?.unlisted ?? []).map((c) => [c.id, c]));
  const almost = (ai?.almost ?? []).filter((a) => unlisted.has(a.id) && (me.manager || mine.has(a.id) || reps.get(a.id)?.id === me.id));

  const tags = [
    prof?.role || p.role_category,
    (p.level || prof?.level) && (LEVEL_LABEL[p.level || prof!.level] ?? p.level),
    prof?.hours,
    salaryRange(p.salary_min, p.salary_max),
    [p.location, p.work_mode ? WORK_MODE_LABEL[p.work_mode] ?? p.work_mode : null].filter(Boolean).join(" · "),
    p.starts,
  ].filter(Boolean) as string[];
  const start = Object.fromEntries(POSITION_FIELDS.map((f) => [f, p[f] == null ? "" : String(p[f])])) as PositionDraft;
  const fromWhere = p.source.startsWith("lead:") || p.source === "callback" ? " · from an owner's request" : p.source === "meet_us" ? " · from a call booked with us" : "";

  return (
    <div className={styles.page}>
      <Link href="/admin/matches" className="small muted">
        Openings
      </Link>
      <div className={styles.head}>
        <div>
          <h1>{p.title}</h1>
          <p className="muted">
            {[p.company, p.contact_name && `contact: ${p.contact_name}`].filter(Boolean).join(" · ")}
            {p.company || p.contact_name ? " · " : ""}
            {p.status === "closed" ? "Closed · " : ""}Added {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {fromWhere}
            {p.url && (
              <>
                {" · "}
                <a href={p.url} target="_blank" rel="noreferrer">
                  The post
                </a>
              </>
            )}
          </p>
          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          )}
        </div>
        <form action={setPositionStatus.bind(null, p.id, p.status === "closed" ? "open" : "closed")}>
          <button className="btn btn-ghost btn-small" type="submit">
            {p.status === "closed" ? "Reopen" : "Filled or closed"}
          </button>
        </form>
      </div>
      {sp.saved === "1" && <p className="notice notice-good">Saved. The write-up and matches update in a minute.</p>}

      <div className={styles.two}>
        <section className={styles.box}>
          <h2>The job</h2>
          {prof?.job ? (
            <>
              <p>{prof.job}</p>
              {prof.day && (
                <>
                  <h3>The day</h3>
                  <p>{prof.day}</p>
                </>
              )}
              {prof.thrives.length > 0 && (
                <>
                  <h3>Who does well here</h3>
                  <ul>
                    {prof.thrives.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="muted">Writing this up… refresh in a minute.</p>
          )}
        </section>
        <section className={`${styles.box} ${styles.askBox}`}>
          <h2>Still to ask the owner</h2>
          {prof?.ask?.length ? (
            <ul>
              {prof.ask.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{prof?.job ? "Nothing important missing." : "…"}</p>
          )}
          {prof?.phone && <p style={{ marginTop: 10 }}>Owner&rsquo;s phone: {prof.phone}</p>}
          <form action={addNote.bind(null, p.id)} style={{ marginTop: 12 }}>
            <textarea className="textarea" name="note" rows={2} placeholder="What did the owner say? (pay, hours, what they're like…)" />
            <button className="btn btn-ghost btn-small" type="submit" style={{ marginTop: 6 }}>
              Add to this opening
            </button>
          </form>
          {(prof?.notes?.length ?? 0) > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="small" style={{ cursor: "pointer" }}>
                Notes so far ({prof!.notes!.length})
              </summary>
              <ul className="small" style={{ marginTop: 6 }}>
                {prof!.notes!.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>

      <section className={styles.box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2>{me.manager ? "Best matches" : "Your candidates who fit"}</h2>
          <form action={rematch.bind(null, p.id)}>
            <button className="btn btn-ghost btn-small" type="submit">
              Check again now
            </button>
          </form>
        </div>
        {ai ? <p className={styles.muted}>Checked {ago(ai.at)} against every candidate. New candidates are checked automatically.</p> : <p className={styles.muted}>Finding matches… refresh in a minute.</p>}
        {ms.length ? (
          ms.map(({ c, m, flag }) => {
            const st = stages.get(c.id);
            return (
              <div key={c.id} className={styles.match}>
                <span className={`tag ${m.fit === "strong" ? "tag-good" : "tag-gold"}`}>{m.fit === "strong" ? "Strong" : "Good"}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link prefetch={false} href={`/admin/candidates/${c.id}`}>
                    <b>{c.full_name}</b>
                  </Link>
                  {repName(c.id) && <span className={styles.muted}> · {repName(c.id)}</span>}
                  {st && (
                    <span className={`${styles.stage} ${st.stale ? styles.stale : ""}`}>
                      {STAGE[st.stage]} {ago(st.at)}
                      {st.stale ? " · follow up" : ""}
                    </span>
                  )}
                  <div className={styles.why}>{m.why.join(" · ")}</div>
                  {flag && <div className={styles.flag}>⚠ {flag}</div>}
                </div>
                <div className={styles.acts}>
                  {(!st || st.stale || st.stage === "sent") && <SendToOwner positionId={p.id} candidateId={c.id} label={!st ? "Send to owner" : st.stale ? "Follow up" : "Send again"} />}
                  <details>
                    <summary className="btn btn-ghost btn-small" style={{ listStyle: "none" }}>
                      Not a fit
                    </summary>
                    <form action={markNotAFit.bind(null, p.id, c.id, true)} style={{ marginTop: 6, display: "grid", gap: 6, minWidth: 220 }}>
                      <input className="input" name="reason" placeholder="Why? (helps the next match)" />
                      <button className="btn btn-ghost btn-small" type="submit">
                        Remove
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            );
          })
        ) : (
          <p className="muted small">{ai ? "No one we have fits this one well yet. New candidates are checked automatically." : ""}</p>
        )}
        {almost.length > 0 && (
          <div className={styles.removed}>
            <b className="small">Could fit once their profile is finished</b>
            {almost.map((a) => (
              <div key={a.id} className={styles.match}>
                <span className="tag">Almost</span>
                <div>
                  <Link prefetch={false} href={`/admin/candidates/${a.id}`}>
                    <b>{unlisted.get(a.id)!.full_name}</b>
                  </Link>
                  <div className={styles.why}>{a.why}</div>
                  <div className={styles.flag}>Needs: {a.missing}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {removed.length > 0 && (
          <details className={styles.removed}>
            <summary>Marked not a fit ({removed.length})</summary>
            {removed.map(({ c, by, reason }) => (
              <div key={c.id} className={styles.match}>
                <div>
                  <Link prefetch={false} href={`/admin/candidates/${c.id}`}>
                    <b>{c.full_name}</b>
                  </Link>
                  <div className={styles.why}>
                    Removed by {by}
                    {reason ? `: ${reason}` : ""}
                  </div>
                </div>
                <form action={markNotAFit.bind(null, p.id, c.id, false)} className={styles.notFit}>
                  <button type="submit" className="btn btn-ghost btn-small">
                    Put back
                  </button>
                </form>
              </div>
            ))}
          </details>
        )}
      </section>

      {p.company && (
        <details className={styles.box}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>About {p.company}</summary>
          <form action={saveCompanyCard.bind(null, p.id, p.company)} style={{ marginTop: 10 }}>
            <textarea className="textarea" name="about" rows={3} defaultValue={card?.about ?? ""} placeholder="What the business is like: what they do, size, pace, the boss, the culture. Used for every opening there." />
            <button className="btn btn-ghost btn-small" type="submit" style={{ marginTop: 6 }}>
              Save
            </button>
            {card && <span className={styles.muted}> {card.by === "auto" ? "Written from their openings." : `Last edited by ${card.by}.`}</span>}
          </form>
        </details>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Edit this opening</summary>
        <div style={{ marginTop: 12 }}>
          <PositionForm id={p.id} start={start} />
        </div>
      </details>
    </div>
  );
}
