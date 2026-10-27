import Link from "next/link";
import { ARTICLES } from "@/lib/articles";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { TEMPLATES } from "@/lib/templates";
import { GuidedForm } from "./GuidedForm";
import styles from "./help.module.css";

export const dynamic = "force-dynamic";

export default async function HiringHelp() {
  const owner = await requireOwner("/hiring-help");
  const { data } = await db()
    .from("unlocks")
    .select("candidate_id, candidates(full_name)")
    .eq("owner_id", owner.id)
    .not("confirmed_at", "is", null)
    .order("signed_at", { ascending: false });
  const candidates = ((data ?? []) as unknown as { candidate_id: string; candidates: { full_name: string } }[]).map((r) => ({
    id: r.candidate_id,
    name: r.candidates.full_name,
  }));

  return (
    <div className="wrap" style={{ paddingBottom: 64 }}>
      <div className={styles.hero}>
        <h1>Hiring help</h1>
        <p>Everything you need to make the offer, do the paperwork and get your new hire off to a great start. Free with your account.</p>
      </div>

      <section className={styles.guided} id="guided">
        <div>
          <h2>Want us to guide you through it?</h2>
          <p>
            For a flat fee, we&rsquo;ll walk through the hire with you, from the interview to the end of their first
            90 days. You&rsquo;ll know the price before anything starts.
          </p>
          <ul>
            <li>Interview prep, and we can sit in</li>
            <li>Making the offer and handling the negotiation</li>
            <li>Paperwork and day-one setup, done with you</li>
            <li>A 90-day plan and check-ins with you and your new hire</li>
          </ul>
        </div>
        <div className={styles.guidedForm}>
          <GuidedForm candidates={candidates} phone={owner.phone ?? ""} />
        </div>
      </section>

      <h2 className={styles.h2}>Fill-in-the-blank paperwork</h2>
      <div className={styles.grid}>
        {TEMPLATES.map((t) => (
          <Link key={t.slug} href={`/hiring-help/templates/${t.slug}`} className={styles.tile}>
            <span className={styles.kind}>Template</span>
            <strong>{t.title}</strong>
            <span>{t.blurb}</span>
            <em>Fill it in →</em>
          </Link>
        ))}
      </div>

      <h2 className={styles.h2}>Hiring advice</h2>
      <div className={styles.grid}>
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/hiring-help/articles/${a.slug}`} className={styles.tile}>
            <span className={styles.kind}>{a.minutes} min read</span>
            <strong>{a.title}</strong>
            <span>{a.blurb}</span>
            <em>Read →</em>
          </Link>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 28 }}>
        Templates and articles are general guidance, not legal or tax advice. Employment rules vary by state, so check
        with your lawyer, accountant or payroll provider.
      </p>
    </div>
  );
}
