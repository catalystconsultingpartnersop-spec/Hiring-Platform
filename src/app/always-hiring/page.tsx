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
        <h1>&ldquo;I wish I had someone.&rdquo;</h1>

        <p className={styles.lede}>You said it today. Probably before lunch.</p>
        <p>
          When your best customer called for the third time and nobody had called him back. When the invoices sat
          another week. When the crew stood around waiting for someone to tell them where to go.
        </p>
        <p>You said it, the day kept moving, and you forgot about it. Tomorrow you&rsquo;ll say it again.</p>

        <h2 className={styles.white}>Everyone is always hiring.</h2>

        <p>
          Nobody is ever &ldquo;not hiring.&rdquo; Every owner is hiring, every single day. Some are active about it.
          Most are just carrying the wish around.
        </p>
        <p>So why do we only look at people on the day we&rsquo;re desperate? We don&rsquo;t look at anything else that way.</p>
        <p>
          You scroll through houses you&rsquo;re not buying. You look at cars, at watches, at places you might go one
          summer. You don&rsquo;t need one today. But looking shows you what&rsquo;s possible. And every so often one
          stops you. You sit there thinking about it, and you realize something&rsquo;s been missing for a while. You
          just couldn&rsquo;t name it until you saw it.
        </p>
        <p>That&rsquo;s a great feeling. We built it for hiring.</p>

        <p className={styles.intro}>We call it</p>
        <h2>Candidate scrolling.</h2>

        <p>
          Open the collection whenever you have five minutes. In the car before you walk into the office. On the couch
          at night. Scroll through real people. Every one of them sat down with our team, and every profile tells you,
          in plain words, what that person is great at.
        </p>
        <p>You&rsquo;re not committing to anything. You&rsquo;re seeing who&rsquo;s available to you.</p>
        <p>
          And something changes when you do. &ldquo;I wish I had someone&rdquo; stops being a wish. It becomes
          &ldquo;there are people like this, and I can reach them.&rdquo;
        </p>
        <p className={styles.beat}>That&rsquo;s a freeing feeling. The help you keep wishing for is real now.</p>
        <p>
          Then one day something goes wrong at two in the afternoon, the same thing that always goes wrong. And this
          time you don&rsquo;t say &ldquo;I wish I had someone.&rdquo; You think of the person you scrolled past on
          Tuesday.
        </p>
        <p className={styles.pull}>That&rsquo;s who I needed today.</p>
        <p className={styles.beat}>
          That&rsquo;s the click. You found the one you were looking for. <span>Or the one you didn&rsquo;t know you needed.</span>
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
