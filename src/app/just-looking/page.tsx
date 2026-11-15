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
  title: "Just looking?",
  description: "You're not moving, and you look at houses anyway. Browse pre-vetted candidates the same way, hiring or not.",
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
        <p className={styles.label}>Just looking?</p>
        <h1>
          You&rsquo;re not moving. <span>You look at houses anyway.</span>
        </h1>

        <p>It&rsquo;s late. The house is quiet. And you&rsquo;re on your phone, three towns over, standing in a kitchen you will never cook in.</p>
        <p>You&rsquo;re not buying. You&rsquo;re just looking.</p>
        <p className={styles.beat}>Then one stops your thumb.</p>
        <p>
          The porch. The light in that kitchen. A minute ago you weren&rsquo;t in the market, and now you&rsquo;re holding
          out your phone: <em>look at this one.</em>
        </p>
        <p>That little jolt is the whole reason we scroll.</p>

        <h2>We built that, for hiring.</h2>

        <p>A collection of people instead of houses. Every one of them sat down with our team before they went up.</p>
        <p>Scroll through them tonight. Nobody calls you. Nobody knows you looked.</p>
        <p>Stop on the one who catches you. Read what they&rsquo;re great at. Tap the heart. Sleep on it.</p>
        <p>Most nights, that&rsquo;s all it is. A good scroll.</p>
        <p className={styles.beat}>
          And then one night you find the one you&rsquo;re looking for. <span>Or the one you didn&rsquo;t know you needed.</span>
        </p>

        <Link href="/candidates" className="btn btn-gold btn-big">
          Start scrolling
        </Link>
      </section>

      {newest.length > 0 && (
        <section className={styles.feed}>
          <div className="wrap">
            <h2>Go ahead. Here are the newest.</h2>
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
