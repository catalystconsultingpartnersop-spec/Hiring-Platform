import { languagesText } from "@/lib/languages";
import Link from "next/link";
import { availabilityLabel } from "@/lib/availability";
import { similarReason } from "@/lib/matching";
import { PendingButton } from "@/components/PendingButton";
import { notFound } from "next/navigation";
import { CandidateCard, roleLine } from "@/components/CandidateCard";
import { MobileBar } from "@/components/MobileBar";
import { ShortlistButton } from "@/components/Shortlist";
import { allListed, getListed, getTiers, similarTo } from "@/lib/catalog";
import { describe, profileOf, TRAITS } from "@/lib/strengths";
import { loadOwnerPage, parseOwnerPage, type OwnerPage } from "@/lib/ownerPage";
import { Candidate, db, Hire, PublicCandidate, Unlock } from "@/lib/db";
import { dateShort, feeFor, LEVEL_LABEL, lines, money, refCode, salaryRange, WORK_MODE_LABEL } from "@/lib/format";

import { latestHire, markPaidFromSession } from "@/lib/hires";
import { PASS_REASONS } from "@/lib/pass";
import { loadPath, PathState, pathState } from "@/lib/path";
import { currentOwner, currentStaff } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { NextSteps } from "./NextSteps";
import { TalkToRep } from "@/components/TalkToRep";
import { getThread, isCutOff, ownerLink, repFor } from "@/lib/ownerMessages";
import { cookies } from "next/headers";
import { readSignedToken } from "@/lib/session";
import { passOnCandidate, reconsiderCandidate } from "./actions";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/candidates/[id]">) {
  const { id } = await params;
  const c = await getListed(id);
  return c ? { title: c.headline ?? "Candidate", description: c.summary?.slice(0, 160) ?? undefined } : { title: "Candidate" };
}

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
  // A free 10-minute call with the rep who met them (2 per owner).
  const rep = await repFor(id).catch(() => null);
  // Their conversation about this candidate: remembered in this browser, or found by their account email.
  const remembered = readSignedToken((await cookies()).get(`tcc_talk_${id.slice(0, 8)}`)?.value, "thr_");
  let th = remembered ? await getThread(remembered).catch(() => null) : null;
  if (!th && owner) {
    const { data } = await db().from("activity_log").select("details").eq("action", "msg_thread").eq("details->>email", owner.email.toLowerCase()).eq("details->>candidate_id", id).limit(1);
    const tid = (data?.[0]?.details as { thread?: string } | undefined)?.thread;
    th = tid ? await getThread(tid).catch(() => null) : null;
  }
  const repCall = rep ? (
    <TalkToRep
      candidateId={id}
      rep={rep.id ? rep.first : "our team"}
      signedIn={!!owner}
      defaults={{ name: owner?.full_name ?? "", company: owner?.company ?? "", phone: owner?.phone ?? "" }}
      thread={th ? { link: ownerLink(th.t.id), count: th.msgs.length, lastFromRep: th.msgs.at(-1)?.from === "rep" } : null}
      cutOff={th?.cutOff || (owner ? await isCutOff(owner.email).catch(() => false) : false)}
    />
  ) : null;
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
        repCall={repCall}
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
        busy={await (await import("@/lib/ownerSchedule")).ownerSchedule(unlock.owner_id, unlock.id)}
        guests={path.meeting ? (await (await import("@/lib/meetingGuests")).guestsFor(path.meeting.id)).map(({ name, email }) => ({ name, email })) : []}
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
  const [tiers, { rows }, page] = await Promise.all([getTiers(), allListed(), loadOwnerPage(id)]);
  const similar = similarTo(c, rows).map((s) => ({ c: s, fee: feeFor(s, tiers), reason: similarReason(c, s) }));
  return <Teaser c={c} page={page} fee={feeFor(c, tiers)} similar={similar} repCall={repCall} />;
}

// The few facts an owner checks first, as tiles.
function Tiles({ c, page }: { c: PublicCandidate; page: OwnerPage | null }) {
  const level = c.level ? LEVEL_LABEL[c.level] : null;
  const tiles: [string, string | null][] = [
    ["Experience", [level, page?.years].filter(Boolean).join(", ") || null],
    ["Location", c.location_region],
    ["Works", c.work_mode ? WORK_MODE_LABEL[c.work_mode] : null],
    ["Looking for", salaryRange(c.salary_min, c.salary_max)],
    ["Speaks", languagesText(c.languages)],
    ["Can start", availabilityLabel(c.available ?? (c as { application?: Record<string, string> }).application?.available)],
  ];
  const also = (c.also_roles ?? []).join(", ");
  return (
    <dl className={styles.tiles}>
      {tiles
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      {also && (
        <div className={styles.tileWide}>
          <dt>Also a fit for</dt>
          <dd>{also}</dd>
        </div>
      )}
    </dl>
  );
}

// Their natural strengths, in everyday words.
function HowWork({ c }: { c: PublicCandidate }) {
  const p = profileOf(c.working_genius);
  const d = describe(c.working_genius);
  if (!d) return null;
  const own = c.strengths ?? [];
  return (
    <section className={styles.block}>
      <h2>How they work</h2>
      <div className={styles.work}>
        <div className={styles.workTags}>
          {p.primary.map((l) => (
            <span key={l} className={styles.tagMain}>
              {TRAITS[l].label}
            </span>
          ))}
          {p.secondary.map((l) => (
            <span key={l}>{TRAITS[l].label}</span>
          ))}
          {own.map((w) => (
            <span key={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</span>
          ))}
        </div>
        <p>{d.thrives}</p>
        {d.alsoBrings && <p>{d.alsoBrings}</p>}
      </div>
    </section>
  );
}

function Profile({ c, page }: { c: PublicCandidate; page: OwnerPage | null }) {
  const label = roleLine(c);
  const intro = page?.intro || c.summary;
  return (
    <>
      {label && <p className={styles.chip}>{label}</p>}
      <h1 className={styles.headline}>{c.headline}</h1>
      {intro && (
        <div className={styles.intro}>
          {lines(intro).map((p, i) => (
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
      <Tiles c={c} page={page} />
      {page && page.handle.length > 0 && (
        <section className={styles.block}>
          <h2>What they&rsquo;d handle for you</h2>
          <p className={styles.blockSub}>From their experience and our conversation with them.</p>
          <ul className={styles.handle}>
            {page.handle.map((h) => (
              <li key={h.title}>
                <span className={styles.handleIcon} aria-hidden="true">
                  {h.icon || "✓"}
                </span>
                <div>
                  <b>{h.title}</b>
                  {h.detail && <span>{h.detail}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <HowWork c={c} />
      {page && page.fit.length > 0 && (
        <section className={styles.block}>
          <h2>A strong fit if you&hellip;</h2>
          <ul className={styles.fit}>
            {page.fit.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}
      <div className={styles.vet}>
        <span className={styles.vetMark} aria-hidden="true">
          ✓
        </span>
        <p>
          <b>We met them one-on-one.</b> We went through their experience, learned how they work best, and checked what
          they&rsquo;re looking for, before listing them here.
        </p>
      </div>
      <p className={styles.ref}>
        {refCode(c.id)}
        {c.listed_at ? ` · listed ${dateShort(c.listed_at)}` : ""}
      </p>
    </>
  );
}

function Teaser({
  c,
  page,
  fee,
  similar,
  repCall,
}: {
  repCall: React.ReactNode;
  c: PublicCandidate;
  page: OwnerPage | null;
  fee: number | null;
  similar: { c: PublicCandidate; fee: number | null; reason: string | null }[];
}) {
  return (
    <div className={`wrap ${styles.page}`}>
      <Link href="/candidates" className={`small ${styles.back}`}>
        All candidates
      </Link>
      <div className={styles.grid}>
        <article>
          <Profile c={c} page={page} />
        </article>
        <aside className={styles.side}>
          <div className={styles.deal}>
            <h2>Like what you see?</h2>
            <p className={styles.dealSub}>
              See their name, resume and phone number, and reach out to them directly. Talking and interviewing are free.
            </p>
            <div className={styles.dealNums}>
              <div>
                <b>$0</b>
                <span>to meet them</span>
              </div>
              <div>
                <b>{fee != null ? money(fee) : "Ask us"}</b>
                <span>flat, only if you hire</span>
              </div>
            </div>
            <Link className="btn btn-gold" href={`/candidates/${c.id}/unlock`} style={{ width: "100%" }}>
              See who this is
            </Link>
            <div className={styles.dealSave}>
              <ShortlistButton id={c.id} label />
            </div>
            <p className={styles.dealNote}>
              You&rsquo;ll sign a short agreement and keep a card on file. Nothing is charged unless you hire.{" "}
              <Link href={`/contact?c=${c.id}`}>Questions about this candidate?</Link>
            </p>
          </div>
          {repCall}
        </aside>
      </div>
      {similar.length > 0 && (
        <section className={styles.similar}>
          <h2>More candidates like this</h2>
          <div className="shelf">
            {similar.map((s) => (
              <CandidateCard key={s.c.id} c={s.c} fee={s.fee} href={`/candidates/${s.c.id}`} reason={s.reason} />
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
  repCall,
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
  guests,
  busy,
}: {
  repCall: React.ReactNode;
  guests: { name: string; email: string }[];
  busy: import("@/lib/ownerSchedule").Busy[];
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
            <div className={styles.quick}>
              <a className={`${styles.qbtn} ${styles.qgold}`} href={`/api/summary/${c.id}`} target="_blank" rel="noopener">
                🧾 1-page summary
              </a>
              {(c.resume_path || ((c as { application?: Record<string, string> }).application?.owner_resume === "clean" && (c as { application?: Record<string, string> }).application?.clean_resume)) && (
                <a className={styles.qbtn} href={`/api/resume/${c.id}`}>
                  📄 Resume
                </a>
              )}
              {c.phone && (
                <a className={styles.qbtn} href={`tel:${c.phone}`}>
                  📞 {c.phone}
                </a>
              )}
              <a className={styles.qbtn} href={`mailto:${c.email}`}>
                ✉️ Email
              </a>
              {c.linkedin_url && (
                <a className={styles.qbtn} href={c.linkedin_url} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
          <NextSteps c={c} path={path} again={again} step={step} guests={guests} busy={busy} />
          <Profile c={c} page={parseOwnerPage((c as { application?: Record<string, string> }).application?.owner_page)} />
          {c.full_profile && (
            <section className={styles.full}>
              <h2>Full profile</h2>
              {lines(c.full_profile).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          )}
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
                    <PendingButton className="btn btn-ghost btn-small" pendingText="Removing…" style={{ marginTop: 10, width: "100%" }}>
                      Remove from my list
                    </PendingButton>
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
              {unlock.card_label ? ` ${unlock.card_label.charAt(0).toUpperCase()}${unlock.card_label.slice(1)}${/on file/i.test(unlock.card_label) ? "" : " on file"}.` : ""}
            </p>
          </div>
          {!passed && !taken && (!status || status === "pending") && repCall}
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
