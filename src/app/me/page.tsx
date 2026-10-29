import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CandidateCard } from "@/components/CandidateCard";
import { manageLink } from "@/lib/calls";
import { CAREER_ARTICLES } from "@/lib/careerArticles";
import { Candidate, db } from "@/lib/db";
import { contactPhone, contactPhoneHref, dateShort } from "@/lib/format";
import { repFor } from "@/lib/notify";
import { currentCandidateId, signedToken } from "@/lib/session";
import { formatInZone, nowMs } from "@/lib/time";
import { hideMyProfile, showMyProfile, signOutCandidate, tellUsAJob } from "./actions";
import styles from "./me.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your page" };

type Call = { id: string; starts_at: string; status: string; candidate_time_zone: string | null };
type Step = { state: "done" | "now" | "next"; title: string; detail?: React.ReactNode };

const DONE: Record<string, React.ReactNode> = {
  paused: "Your profile is hidden from employers. Turn it back on whenever you're ready.",
  back: "Welcome back! Your profile is visible to employers again.",
  job: "Congratulations! We've let your rep know, and your profile is hidden from employers.",
};

export default async function MyPage({ searchParams }: PageProps<"/me">) {
  const sp = await searchParams;
  const id = await currentCandidateId();
  if (!id) redirect("/me/login");
  const { data } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!data || data.status === "archived") redirect("/me/login");
  const c = data as Candidate;

  const [{ data: calls }, { count: asked }, rep] = await Promise.all([
    db()
      .from("onboarding_calls")
      .select("id, starts_at, status, candidate_time_zone")
      .eq("candidate_id", id)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: false })
      .limit(1),
    db().from("unlocks").select("id", { count: "exact", head: true }).eq("candidate_id", id).not("confirmed_at", "is", null),
    repFor(id),
  ]);
  const call = (calls?.[0] as Call | undefined) ?? null;
  const meetCount = asked ?? 0;
  const views = c.profile_views ?? 0;
  const first = c.full_name.split(" ")[0];

  const s = c.status;
  const wasListed = !!c.listed_at || s === "listed" || s === "hired";
  const upcoming = call && call.status === "booked" && Date.parse(call.starts_at) > nowMs() ? call : null;
  const talked = s !== "applied" || call?.status === "done" || (!!call && call.status === "booked" && !upcoming);
  const callWhen = upcoming ? formatInZone(upcoming.starts_at, upcoming.candidate_time_zone ?? "America/New_York") : "";
  const bookLink = `/apply/book?c=${signedToken(`cand_${id}`, 30)}`;
  const repFirst = rep?.full_name?.split(" ")[0] || "your rep";

  const steps: Step[] = [
    { state: "done", title: "You joined", detail: `Welcome, ${dateShort(c.created_at)}` },
    talked
      ? { state: "done", title: "Your conversation", detail: "Great talking with you" }
      : upcoming
        ? {
            state: "now",
            title: "Your conversation",
            detail: (
              <>
                {callWhen}. <a href={manageLink(upcoming.id)}>Join, move or cancel</a>
              </>
            ),
          }
        : {
            state: "now",
            title: "Your conversation",
            detail: (
              <>
                Pick a time for a relaxed video call. <Link href={bookLink}>Choose a time</Link>
              </>
            ),
          },
    wasListed
      ? { state: "done", title: "Your profile", detail: "Written and ready" }
      : { state: talked ? "now" : "next", title: "Your profile", detail: talked ? `${rep?.full_name ? `${repFirst} is` : "We're"} writing it now. You'll see it here when it's ready.` : undefined },
    s === "listed" || s === "hired"
      ? { state: "done", title: "You're officially a candidate", detail: c.listed_at ? `Since ${dateShort(c.listed_at)}` : "Employers can find you" }
      : s === "paused" && wasListed
        ? { state: "now", title: "You're officially a candidate", detail: "Paused for now, so employers can't see you" }
        : { state: "next", title: "You're officially a candidate" },
    s === "hired"
      ? { state: "done", title: "Employers want to meet you" }
      : meetCount > 0
        ? { state: "now", title: "Employers want to meet you", detail: `${meetCount} ${meetCount === 1 ? "has" : "have"} asked so far. Expect them to reach out.` }
        : s === "listed"
          ? { state: "now", title: "Employers want to meet you", detail: "Employers are browsing. We'll show it here when one asks to meet you." }
          : { state: "next", title: "Employers want to meet you" },
    s === "hired" ? { state: "done", title: "You're hired!", detail: "Congratulations. We're so glad for you." } : { state: "next", title: "You're hired" },
  ];

  const showCard = !!c.headline && wasListed;

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div className="wrap">
          <p className={styles.eyebrow}>Your page</p>
          <h1 className={styles.h1}>Hi {first}, here&rsquo;s where things stand.</h1>
        </div>
      </div>

      <div className={`wrap ${styles.grid}`}>
        <main>
          {typeof sp.done === "string" && DONE[sp.done] && (
            <p className="notice notice-good" role="status" style={{ marginTop: 0 }}>
              {DONE[sp.done]}
            </p>
          )}
          <section className={`panel ${styles.journey}`} aria-label="Your progress">
            <ol>
              {steps.map((st) => (
                <li key={st.title} className={styles[st.state]}>
                  <i aria-hidden="true" />
                  <div>
                    <b>{st.title}</b>
                    {st.detail && <small>{st.detail}</small>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {showCard ? (
            <section className={styles.cardWrap}>
              <h2 className={styles.h2}>How employers see you</h2>
              <p className="small muted" style={{ margin: "4px 0 14px" }}>
                No name, no contact details. Employers see who you are only after they sign an agreement to meet you.
              </p>
              <div className={styles.card}>
                <CandidateCard c={c} fee={null} hideFee />
              </div>
              <p className="small muted" style={{ marginTop: 12 }}>
                Want to change something? Tell {rep?.full_name ? repFirst : "us"} and we&rsquo;ll update it.
              </p>
            </section>
          ) : (
            <section className={`panel panel-wash ${styles.cardWrap}`}>
              <h2 className={styles.h2}>Your profile</h2>
              <p className="small" style={{ margin: "6px 0 0" }}>
                After your conversation, we write a short profile about how you work and what you&rsquo;re great at.
                You&rsquo;ll see it here exactly as employers will.
              </p>
            </section>
          )}

          <section style={{ marginTop: 36 }}>
            <h2 className={styles.h2}>Career help</h2>
            <div className={styles.help}>
              {CAREER_ARTICLES.slice(0, 4).map((a) => (
                <Link key={a.slug} href={`/join/help/${a.slug}`}>
                  <strong>{a.title}</strong>
                  <span>{a.minutes} min read</span>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.side}>
          {wasListed && (
            <div className={styles.stats}>
              <div>
                <strong>{views}</strong>
                <span>{views === 1 ? "view" : "views"} of your full profile</span>
              </div>
              <div>
                <strong>{meetCount}</strong>
                <span>asked to meet you</span>
              </div>
            </div>
          )}

          <div className="panel">
            <p className={styles.sideLabel}>Your rep</p>
            {rep?.full_name ? (
              <>
                <p className={styles.repName}>{rep.full_name}</p>
                <p className="small" style={{ margin: "4px 0 0" }}>
                  <a href={`mailto:${rep.email}`}>{rep.email}</a>
                </p>
              </>
            ) : (
              <p className={styles.repName}>Our team</p>
            )}
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              Questions about a job, an interview or an offer? We&rsquo;re here for all of it. Or text{" "}
              <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>.
            </p>
          </div>

          {s === "listed" && (
            <div className="panel">
              <p className={styles.sideLabel}>You&rsquo;re in control</p>
              <details className={styles.ctl}>
                <summary>Found a job? Tell us</summary>
                <form action={tellUsAJob}>
                  <input className="input" name="where" placeholder="Where? (optional)" maxLength={300} />
                  <button className="btn btn-small" type="submit" style={{ marginTop: 10 }}>
                    I found a job
                  </button>
                  <p className="small muted" style={{ margin: "8px 0 0" }}>
                    We&rsquo;ll celebrate with you and hide your profile from employers.
                  </p>
                </form>
              </details>
              <details className={styles.ctl}>
                <summary>Need a break? Hide your profile</summary>
                <form action={hideMyProfile}>
                  <p className="small muted" style={{ margin: "8px 0 10px" }}>
                    Employers won&rsquo;t see you until you turn it back on. Nothing else changes.
                  </p>
                  <button className="btn btn-small btn-ghost" type="submit">
                    Hide my profile for now
                  </button>
                </form>
              </details>
            </div>
          )}
          {s === "paused" && c.self_paused_at && (
            <div className="panel">
              <p className={styles.sideLabel}>Your profile is hidden</p>
              <p className="small" style={{ margin: "0 0 12px" }}>
                Since {dateShort(c.self_paused_at)}. Ready to be seen again?
              </p>
              <form action={showMyProfile}>
                <button className="btn btn-gold btn-small" type="submit">
                  Show my profile again
                </button>
              </form>
            </div>
          )}
          {s === "paused" && !c.self_paused_at && (
            <div className="panel">
              <p className={styles.sideLabel}>Your profile is paused</p>
              <p className="small" style={{ margin: 0 }}>
                {rep?.full_name ? repFirst : "We"} will be in touch about next steps.
              </p>
            </div>
          )}

          <form action={signOutCandidate}>
            <button className="linkish small" type="submit" style={{ marginTop: 4 }}>
              Sign out
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
