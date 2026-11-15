import type { Metadata } from "next";
import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import { Seen } from "@/components/Seen";
import { keepCandidatesOut } from "@/lib/candidateMode";
import { allListed, getTiers, interviewingIds } from "@/lib/catalog";
import { feeFor } from "@/lib/format";
import styles from "./looking.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Candidate scrolling",
  description: "Everyone is always hiring. Scroll through the people who are available to you, any day.",
};

// The "everyone is always hiring" idea, told from the owner's day, then real people to scroll.
// Reached from posters and the footer; deliberately not in the top menu.
export default async function AlwaysHiringPage() {
  await keepCandidatesOut();
  const [{ rows }, tiers, busy] = await Promise.all([allListed(), getTiers(), interviewingIds()]);
  const newest = [...rows].sort((a, b) => String(b.listed_at ?? "").localeCompare(String(a.listed_at ?? ""))).slice(0, 4);
  return (
    <div className={styles.page}>
      <Seen step="just_looking" />
      <section className={`wrap ${styles.story}`}>
        <p className={styles.label}>Everyone&rsquo;s always hiring</p>
        <h1>
          &ldquo;I wish I had someone.&rdquo; <span>How many times a day do you say it?</span>
        </h1>

        <ul className={styles.moments}>
          <li>Your best customer called three times this week. Nobody called him back.</li>
          <li>The invoices sat another week.</li>
          <li>The crew stood around for an hour, because nobody told them where to go.</li>
        </ul>
        <p>It happens every day. Everyone is always hiring.</p>

        <p className={styles.intro}>So we&rsquo;d like to introduce</p>
        <h2>Candidate scrolling.</h2>

        <p>Scroll through the people who are available to you. Any day, for a few minutes.</p>
        <p>See who&rsquo;s out there. Stop on the one who catches you. Tap the heart.</p>
        <p className={styles.beat}>It&rsquo;s a freeing feeling, seeing who&rsquo;s available to you.</p>
        <p>
          And one day it clicks. <em>That&rsquo;s who I needed today.</em>
        </p>

        <Link href="/candidates" className="btn btn-gold btn-big">
          Start scrolling
        </Link>
      </section>

      {newest.length > 0 && (
        <section className={styles.feed}>
          <div className="wrap">
            <h2>Start scrolling. Here are the newest.</h2>
            <div className="cards">
              {newest.map((c) => (
                <CandidateCard key={c.id} c={c} fee={feeFor(c, tiers)} href={`/candidates/${c.id}`} store interviewing={busy.has(c.id)} />
              ))}
            </div>
            <div className={styles.more}>
              <Link href="/candidates" className="btn btn-big">
                Keep scrolling
              </Link>
              <p>One flat fee, only if you hire. Never a percentage of salary.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
