import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateCard, HowTheyWork, WorksBest } from "@/components/CandidateCard";
import { MobileBar } from "@/components/MobileBar";
import { ShortlistButton } from "@/components/Shortlist";
import { allListed, getListed, getTiers, industriesOf, similarTo } from "@/lib/catalog";
import { wiredFor } from "@/lib/strengths";
import { Candidate, db, Hire, PublicCandidate, Unlock } from "@/lib/db";
import { dateShort, feeFor, LEVEL_LABEL, lines, money, refCode, salaryRange, WORK_MODE_LABEL } from "@/lib/format";
import { latestHire, markPaidFromSession } from "@/lib/hires";
import { PASS_REASONS } from "@/lib/pass";
import { loadPath, PathState, pathState } from "@/lib/path";
import { currentOwner, currentStaff } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { NextSteps } from "./NextSteps";
import { passOnCandidate, reconsiderCandidate } from "./actions";
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
    const path = pathState(unlock, await loadPath([unlock.id]), {
      hireStatus: hire?.status,
      candidateStatus: (data as Candidate).status,
      nowMs: nowMs(),
    });
    return (
      <Unlocked
        path={path}
        again={sp.again === "1"}
        step={typeof sp.step === "string" ? sp.step : ""}
        c={data as Candidate}
        unlock={unlock}
        hire={hire}
        justUnlocked={sp.unlocked === "1"}
        paidNotice={paidNotice}
        hireNote={typeof sp.hire === "string" ? sp.hire : ""}
        cameBack={sp.back === "1"}
      />
    );
  }

  const c = await getListed(id);
  if (!c) notFound();
  // Count the view for the candidate's own page (not when our team is looking).
  if (!(await currentStaff().catch(() => null))) {
    await db().rpc("bump_profile_view", { cid: id }).then(
      () => undefined,
      () => undefined,
    );
  }
  const [tiers, { rows }] = await Promise.all([getTiers(), allListed()]);
  const similar = similarTo(c, rows).map((s) => ({ c: s, fee: feeFor(s, tiers) }));
  return <Teaser c={c} fee={feeFor(c, tiers)} similar={similar} />;
}

function Facts({ c }: { c: PublicCandidate }) {
  const rows: [string, string | null][] = [
    ["Role", c.role_category],
    ["Also a fit for", (c.also_roles ?? []).join(", ") || null],
    ["Industry", industriesOf(c).join(", ") || null],
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
        <div className={styles.wired}>
          <p className={styles.wiredLabel}>Wired for</p>
          <ul className={styles.wiredList}>
            {wiredFor(c).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
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
      <MobileBar label={fee != null ? money(fee) : "Flat fee"} sub="only if you hire">
        <Link className="btn btn-gold" href={`/candidates/${c.id}/unlock`}>
          See who this is
        </Link>
      </MobileBar>
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
  cameBack,
  path,
  again,
  step,
}: {
  path: PathState;
  again: boolean;
  step: string;
  c: Candidate;
  unlock: Unlock;
  hire: Hire | null;
  justUnlocked: boolean;
  paidNotice: boolean;
  hireNote: string;
  cameBack: boolean;
}) {
  const status = hire?.status;
  const passed = !!unlock.passed_at && status !== "paid" && status !== "hired";
  // Hired by another company while this owner was still considering.
  const taken = !passed && c.status === "hired" && status !== "paid" && status !== "hired";
  const first = c.full_name.split(" ")[0];
  return (
    <div className={`wrap ${styles.page}`}>
      <Link href="/account" className={`small ${styles.back}`}>
        Your candidates
      </Link>
      {taken && (
        <div className="notice notice-gold" role="status">
          <strong>{first} is no longer available.</strong> They accepted a position with another employer on{" "}
          {dateShort(c.updated_at)}. Nothing was charged, and you owe nothing for {first}.{" "}
          <Link href={`/candidates${c.role_category ? `?role=${encodeURIComponent(c.role_category)}` : ""}`}>
            See similar candidates
          </Link>
        </div>
      )}
      {cameBack && (
        <p className="notice notice-good" role="status">
          {first} is back on your list.
        </p>
      )}
      {justUnlocked && (
        <p className="notice notice-good">
          You&rsquo;re in. Here&rsquo;s who they are, with an easy first step below. Your copy of the agreement is in your
          email.
        </p>
      )}
      {(paidNotice || hireNote === "paid") && hire && (
        <div className="notice notice-good" role="status">
          <strong>Payment received: {money(hire.amount_cents)}.</strong> Go ahead and make the offer to{" "}
          {c.full_name.split(" ")[0]}. Your receipt is in your email, or{" "}
          <Link href={`/account/receipts/${hire.id}`}>view it here</Link>. Next:{" "}
          <Link href={`/hiring-help/templates/offer-letter?c=${c.id}`}>fill in an offer letter</Link>.
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
          <NextSteps c={c} path={path} again={again} step={step} />
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
            {passed ? (
              <>
                <span className="tag">Not a fit · {dateShort(unlock.passed_at)}</span>
                <p className={styles.sideMsg}>
                  You took {first} off your list{unlock.pass_reason ? `: “${unlock.pass_reason}”` : "."} Thanks for
                  letting us know.
                </p>
                <form action={reconsiderCandidate.bind(null, c.id)}>
                  <button className="btn btn-ghost" type="submit" style={{ width: "100%", marginTop: 14 }}>
                    Changed your mind? Put {first} back
                  </button>
                </form>
                <Link
                  className="btn btn-gold"
                  href={`/candidates${c.role_category ? `?role=${encodeURIComponent(c.role_category)}` : ""}`}
                  style={{ width: "100%", marginTop: 10 }}
                >
                  See similar candidates
                </Link>
              </>
            ) : taken ? (
              <>
                <span className="tag">No longer available</span>
                <p className={styles.sideMsg}>
                  {first} was hired elsewhere. Nothing was charged.
                </p>
                <Link
                  className="btn btn-gold"
                  href={`/candidates${c.role_category ? `?role=${encodeURIComponent(c.role_category)}` : ""}`}
                  style={{ width: "100%", marginTop: 14 }}
                >
                  See similar candidates
                </Link>
              </>
            ) : !status || status === "pending" ? (
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
                <details className={styles.pass}>
                  <summary>Not a fit? Take {first} off your list</summary>
                  <form action={passOnCandidate.bind(null, c.id)}>
                    <p className="small muted" style={{ margin: "10px 0 8px" }}>
                      No problem. It helps us find you better matches if you tell us why.
                    </p>
                    {PASS_REASONS.map((r, i) => (
                      <label key={r} className={styles.passReason}>
                        <input type="radio" name="reason" value={r} defaultChecked={i === 0} /> {r}
                      </label>
                    ))}
                    <textarea className="input" name="note" rows={2} maxLength={500} placeholder="Anything else? (optional)" />
                    <button className="btn btn-ghost btn-small" type="submit" style={{ marginTop: 10, width: "100%" }}>
                      Remove from my list
                    </button>
                    <p className="small muted" style={{ margin: "10px 0 0" }}>
                      Nothing is charged. Your agreement stays on file, so if you ever do hire {first}, the usual fee
                      applies. You can put {first} back anytime.
                    </p>
                  </form>
                </details>
              </>
            ) : status === "paid" ? (
              <>
                <span className="tag tag-good">Paid {dateShort(hire!.paid_at)}</span>
                <p className={styles.sideMsg}>
                  You&rsquo;re all set to hire {c.full_name.split(" ")[0]}.{" "}
                  <Link href={`/account/receipts/${hire!.id}`}>View your receipt</Link>
                  {" · "}
                  <Link href={`/hiring-help/templates/offer-letter?c=${c.id}`}>Offer letter template</Link>
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
      {!passed && !taken && (!status || status === "pending") && (
        <MobileBar label={unlock.fee_cents != null ? money(unlock.fee_cents) : "Flat fee"} sub="charged only when you hire">
          <Link className="btn btn-gold" href={`/candidates/${c.id}/hire`}>
            I&rsquo;ve decided to hire
          </Link>
        </MobileBar>
      )}
    </div>
  );
}
