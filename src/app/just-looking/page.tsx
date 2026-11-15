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
  title: "Not hiring today? See who's out there",
  description: "Every day you think, I wish I had someone who could handle this. See who's out there, even when you're not hiring.",
};

// For the owner who likes to look. A short story, then real people to scroll.
// Reached from posters and the footer; deliberately not in the top menu.
export default async function JustLookingPage() {
  await keepCandidatesOut();
  const [{ rows }, tiers, busy] = await Promise.all([allListed(), getTiers(), interviewingIds()]);
  const newest = [...rows].sort((a, b) => String(b.listed_at ?? "").localeCompare(String(a.listed_at ?? ""))).slice(0, 4);
  return (
    <div className={styles.page}>
      <Seen step="just_looking" />
      <section className={`wrap ${styles.story}`}>
        <p className={styles.label}>Not hiring today?</p>
        <h1>
          &ldquo;I wish I had someone who could just handle this.&rdquo; <span>How many times did you say it this week?</span>
        </h1>

        <p>The invoices that sat another week. The customer nobody called back. The schedule that only lives in your head.</p>
        <p>The thing you did yourself at ten at night, because explaining it would have taken longer.</p>
        <p>
          Every day in a business has one of those moments. You think, <em>I wish I had someone.</em> Then the phone
          rings, and the thought is gone.
        </p>
        <p>You&rsquo;re not hiring. There&rsquo;s no opening and no job description. So the thought never turns into anything.</p>

        <h2>So don&rsquo;t hire. Just look.</h2>

        <p>Open the collection for a few minutes, here and there, the way you&rsquo;d check anything else on your phone.</p>
        <p>
          Read what each person is great at. The one who loves the details. The one who keeps a whole office moving.
          The one who picks up the phone and follows through.
        </p>
        <p>There&rsquo;s a quiet relief in it. The people who could help you are out there, and now you can see them.</p>
        <p className={styles.beat}>And then one day it clicks.</p>
        <p>
          Something goes sideways at two in the afternoon, and you think of a person you scrolled past last week.{" "}
          <em>That&rsquo;s who I needed today.</em>
        </p>
        <p className={styles.beat}>
          Now you know who you&rsquo;re looking for. <span>Or you&rsquo;ve found the one you didn&rsquo;t know you needed.</span>
        </p>

        <Link href="/candidates" className="btn btn-gold btn-big">
          See who&rsquo;s out there
        </Link>
        <p className={styles.aside}>
          It&rsquo;s the same reason people look at houses they aren&rsquo;t buying. You don&rsquo;t always know
          what&rsquo;s missing until you see it.
        </p>
      </section>

      {newest.length > 0 && (
        <section className={styles.feed}>
          <div className="wrap">
            <h2>Start here. The newest in the collection.</h2>
            <div className="cards">
              {newest.map((c) => (
                <CandidateCard key={c.id} c={c} fee={feeFor(c, tiers)} href={`/candidates/${c.id}`} store interviewing={busy.has(c.id)} />
              ))}
            </div>
            <div className={styles.more}>
              <Link href="/candidates" className="btn btn-big">
                See them all
              </Link>
              <p>One flat fee, only if you hire. Never a percentage of salary.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
