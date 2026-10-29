import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { ownerHasDocs } from "@/lib/docsAccess";
import { markupToHtml } from "@/lib/markup";
import { getTemplate } from "@/lib/templates";
import styles from "../../help.module.css";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: PageProps<"/hiring-help/articles/[slug]">) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const related = (a.related ?? []).map(getTemplate).filter((t) => t !== null);
  const { hasDocs } = await ownerHasDocs();

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <div className={styles.article}>
        <Link href="/hiring-help" className="small muted">
          Hiring help
        </Link>
        <h1>{a.title}</h1>
        <p className="muted" style={{ fontSize: 18, margin: "0 0 24px" }}>
          {a.blurb} <span className="small">· {a.minutes} min read</span>
        </p>
        <div className={styles.doc} dangerouslySetInnerHTML={{ __html: markupToHtml(a.body) }} />
        {related.length > 0 && (
          <>
            <h2 className={styles.h2}>Templates for this</h2>
            <div className={styles.grid}>
              {related.map((t) => (
                <Link key={t.slug} href={`/hiring-help/templates/${t.slug}`} className={styles.tile}>
                  <strong>{t.title}</strong>
                  <span>{t.blurb}</span>
                  <em>{hasDocs ? "Fill it in →" : "Included when you unlock a candidate"}</em>
                </Link>
              ))}
            </div>
          </>
        )}
        {!hasDocs && (
        <div className="panel panel-wash" style={{ marginTop: 32 }}>
          <strong>Looking for someone who fits?</strong>
          <p className="small muted" style={{ margin: "6px 0 12px" }}>
            Every candidate is interviewed, with how they work best spelled out in plain words. Unlock one and these
            hiring documents come with it, ready to fill in.
          </p>
          <Link className="btn btn-gold btn-small" href="/candidates">
            Browse candidates
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
