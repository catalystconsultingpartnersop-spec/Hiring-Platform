import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateCard, HowTheyWork, Strengths, WorksBest } from "@/components/CandidateCard";
import { ShortlistButton } from "@/components/Shortlist";
import { allListed, getListed, getTiers, similarTo } from "@/lib/catalog";
import { wiredFor } from "@/lib/strengths";
import { Candidate, db, Hire, PublicCandidate, Unlock } from "@/lib/db";
import { dateShort, feeFor, LEVEL_LABEL, lines, money, refCode, salaryRange, WORK_MODE_LABEL } from "@/lib/format";
import { latestHire, markPaidFromSession } from "@/lib/hires";
import { currentOwner } from "@/lib/session";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params, searchParams }: PageProps<"/candidates/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let owner = null;
  try {
    owner = await currentOwner();
  } catch {
    owner = null;
  }
  let unlock: Unlock | null = null;
  if (owner) {
    const { data } = await db()
      .from("unlocks")
      .select("*")
      .eq("owner_id", owner.id)
      .eq("candidate_id", id)
      .not("confirmed_at", "is", null)
      .maybeSingle();
    unlock = (data as Unlock) ?? null;
  }

  // Returning from Stripe: confirm the payment before showing the page.
  let paidNotice = false;
  if (unlock && typeof sp.paid === "string" && sp.paid.startsWith("cs_")) {
    try {
      const r = await markPaidFromSession(sp.paid);
      paidNotice = r.ok;
    } catch (e) {
      console.error(e);
    }
  }

  if (unlock) {
    const { data } = await db().from("candidates").select("*").eq("id", id).single();
    const hire = await latestHire(unlock.id);
    return (
      <Unlocked
        c={data as Candidate}
        unlock={unlock}
        hire={hire}
        justUnlocked={sp.unlocked === "1"}
        paidNotice={paidNotice}
        hireNote={typeof sp.hire === "string" ? sp.hire : ""}
      />
    );
  }

  const c = await getListed(id);
  if (!c) notFound();
  const [tiers, { rows }] = await Promise.all([getTiers(), allListed()]);
  const similar = similarTo(c, rows).map((s) => ({ c: s, fee: feeFor(s, tiers) }));
  return <Teaser c={c} fee={feeFor(c, tiers)} similar={similar} />;
}

function Facts({ c }: { c: PublicCandidate }) {
  const rows: [string, string | null][] = [
    ["Role", c.role_category],
    ["Industry", c.industry],
    ["Experience", c.level ? LEVEL_LABEL[c.level] : null],
    ["Location", c.location_region],
    ["Work setting", c.work_mode ? WORK_MODE_LABEL[c.work_mode] : null],
    ["Salary expectation", salaryRange(c.salary_min, c.salary_max)],
  ];
  return (
    <dl className={styles.facts}>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function Profile({ c }: { c: PublicCandidate }) {
  return (
    <>
      <p className={styles.ref}>
        {refCode(c.id)}
        {c.listed_at ? ` · listed ${dateShort(c.listed_at)}` : ""}
      </p>
      <h1 className={styles.headline}>{c.headline}</h1>
      {wiredFor(c).length > 0 && (
        <p className={styles.wired}>
          <span className="muted">Wired for </span>
          <Strengths items={wiredFor(c)} strong />
        </p>
      )}
      <div className={styles.tagsRow}>
        <WorksBest c={c} detail />
      </div>
      {c.summary && (
        <div className={styles.summary}>
          {lines(c.summary).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      {c.highlights.length > 0 && (
        <ul className={styles.highlights}>
          {c.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      <HowTheyWork c={c} />
    </>
  );
}

function Teaser({
  c,
  fee,
  similar,
}: {
  c: PublicCandidate;
  fee: number | null;
  similar: { c: PublicCandidate; fee: number | null }[];
}) {
  return (
    <div className={`wrap ${styles.page}`}>
      <Link href="/candidates" className={`small ${styles.back}`}>
        All candidates
      </Link>
      <div className={styles.grid}>
        <article>
          <Profile c={c} />
          <Facts c={c} />
        </article>
        <aside className={styles.side}>
          <div className="panel">
            <p className="muted small">Flat fee if you hire</p>
            <p className={styles.fee}>{fee != null ? money(fee) : "Ask us"}</p>
            <p className="small muted">No percentage of salary. Charged only when you decide to hire.</p>
            <Link className="btn btn-gold" href={`/candidates/${c.id}/unlock`} style={{ width: "100%", marginTop: 18 }}>
              See who this is
            </Link>
            <div className={styles.sideSave}>
              <ShortlistButton id={c.id} label />
            </div>
            <p className={`small muted ${styles.sideNote}`}>
              You&rsquo;ll sign a short agreement first. Seeing their name and contact details costs nothing.
            </p>
          </div>
        </aside>
      </div>
      {similar.length > 0 && (
        <section className={styles.similar}>
          <h2>Similar candidates</h2>
          <div className="shelf">
            {similar.map((s) => (
              <CandidateCard key={s.c.id} c={s.c} fee={s.fee} href={`/candidates/${s.c.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Unlocked({
  c,
  unlock,
  hire,
  justUnlocked,
  paidNotice,
  hireNote,
}: {
  c: Candidate;
  unlock: Unlock;
  hire: Hire | null;
  justUnlocked: boolean;
  paidNotice: boolean;
  hireNote: string;
}) {
  const status = hire?.status;
  return (
    <div className={`wrap ${styles.page}`}>
      <Link href="/account" className={`small ${styles.back}`}>
        Your candidates
      </Link>
      {justUnlocked && <p className="notice notice-good">Signed. Here&rsquo;s who they are. A copy of the agreement is in your email.</p>}
      {(paidNotice || hireNote === "paid") && hire && (
        <div className="notice notice-good" role="status">
          <strong>Payment received: {money(hire.amount_cents)}.</strong> Go ahead and make the offer to{" "}
          {c.full_name.split(" ")[0]}. Your receipt is in your email, or{" "}
          <Link href={`/account/receipts/${hire.id}`}>view it here</Link>.
        </div>
      )}
      {hireNote === "cancelled" && <p className="notice">Payment cancelled. Nothing was charged.</p>}
      {hireNote === "requested" && (
        <p className="notice notice-gold">We&rsquo;ve been told you&rsquo;re ready to hire and will contact you with the fee.</p>
      )}

      <div className={styles.grid}>
        <article>
          <div className={styles.identity}>
            <p className="muted small">Candidate {refCode(c.id)}</p>
            <h1>{c.full_name}</h1>
            <ul className={styles.contact}>
              <li>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </li>
              {c.phone && (
                <li>
                  <a href={`tel:${c.phone}`}>{c.phone}</a>
                </li>
              )}
              {c.linkedin_url && (
                <li>
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer">
                    LinkedIn profile
                  </a>
                </li>
              )}
              {c.resume_path && (
                <li>
                  <a href={`/api/resume/${c.id}`}>Download resume</a>
                </li>
              )}
            </ul>
          </div>
          <Profile c={c} />
          {c.full_profile && (
            <section className={styles.full}>
              <h2>Full profile</h2>
              {lines(c.full_profile).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          )}
          <Facts c={c} />
        </article>

        <aside className={styles.side}>
          <div className="panel">
            {!status || status === "pending" ? (
              <>
                <p className="muted small">Your flat fee</p>
                <p className={styles.fee}>{unlock.fee_cents != null ? money(unlock.fee_cents) : "Set with us"}</p>
                <p className="small muted">
                  When you decide to hire {c.full_name.split(" ")[0]}, press the button below. You&rsquo;ll see exactly
                  what happens before anything is charged.
                </p>
                <Link className="btn btn-gold" href={`/candidates/${c.id}/hire`} style={{ width: "100%", marginTop: 18 }}>
                  I&rsquo;ve decided to hire
                </Link>
              </>
            ) : status === "paid" ? (
              <>
                <span className="tag tag-good">Paid {dateShort(hire!.paid_at)}</span>
                <p className={styles.sideMsg}>
                  You&rsquo;re all set to hire {c.full_name.split(" ")[0]}.{" "}
                  <Link href={`/account/receipts/${hire!.id}`}>View your receipt</Link>
                </p>
              </>
            ) : status === "hired" ? (
              <>
                <span className="tag tag-good">Hired</span>
                <p className={styles.sideMsg}>Congratulations on the hire.</p>
              </>
            ) : (
              <>
                <span className="tag">Refunded {dateShort(hire!.refunded_at)}</span>
                <p className={styles.sideMsg}>The fee of {money(hire!.amount_cents)} was refunded.</p>
              </>
            )}
            <p className={`small muted ${styles.sideNote}`}>
              <Link href={`/account/agreements/${unlock.id}`}>Agreement</Link> signed {dateShort(unlock.signed_at)}.
              {unlock.card_label ? ` ${unlock.card_label} on file.` : ""}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
