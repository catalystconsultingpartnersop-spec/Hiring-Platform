import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/articles";
import { ownerHasDocs } from "@/lib/docsAccess";
import { brandName } from "@/lib/format";
import { TEMPLATES } from "@/lib/templates";
import styles from "./help.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Hiring help | ${brandName()}`,
  description: "Practical, plain-English guidance for interviewing, making the offer, the paperwork and the first weeks.",
};

// Advice is open to everyone. The ready-to-use documents come with a client's
// first unlocked candidate.
export default async function HiringHelp({ searchParams }: PageProps<"/hiring-help">) {
  const sp = await searchParams;
  const { hasDocs } = await ownerHasDocs();

  return (
    <div className="wrap" style={{ paddingBottom: 64 }}>
      <div className={styles.hero}>
        <h1>Hiring help</h1>
        <p>
          Practical guidance for every step: interviewing, making the offer, the paperwork and the first weeks. You know
          your business. This is the hiring part, made simple.
        </p>
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

      <h2 className={styles.h2} id="documents" style={{ scrollMarginTop: 16 }}>
        Ready-to-use hiring documents
      </h2>
      {!hasDocs && (
        <div className={`panel ${sp.locked === "1" ? "notice-gold" : "panel-wash"}`} style={{ marginBottom: 16 }}>
          <strong>Included when you unlock your first candidate.</strong>
          <p className="small" style={{ margin: "6px 0 12px" }}>
            Offer letter, confidentiality agreement, contractor agreement, interview scorecard, reference questions and a
            first-90-days plan. Filled in with your details and your candidate&rsquo;s, ready to print or download.
          </p>
          <Link className="btn btn-gold btn-small" href="/candidates">
            Browse candidates
          </Link>
        </div>
      )}
      <div className={styles.grid}>
        {TEMPLATES.map((t) =>
          hasDocs ? (
            <Link key={t.slug} href={`/hiring-help/templates/${t.slug}`} className={styles.tile}>
              <span className={styles.kind}>Template</span>
              <strong>{t.title}</strong>
              <span>{t.blurb}</span>
              <em>Fill it in →</em>
            </Link>
          ) : (
            <div key={t.slug} className={`${styles.tile} ${styles.locked}`}>
              <span className={styles.kind}>Template</span>
              <strong>{t.title}</strong>
              <span>{t.blurb}</span>
              <em>Included when you unlock a candidate</em>
            </div>
          ),
        )}
      </div>

      <p className="small muted" style={{ marginTop: 28 }}>
        Templates and articles are general guidance, not legal or tax advice. Employment rules vary by state, so check
        with your lawyer, accountant or payroll provider.
      </p>
    </div>
  );
}
