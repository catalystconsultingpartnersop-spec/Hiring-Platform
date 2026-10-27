import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { markupToHtml } from "@/lib/markup";
import { requireOwner } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import styles from "../../help.module.css";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: PageProps<"/hiring-help/articles/[slug]">) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  await requireOwner(`/hiring-help/articles/${slug}`);
  const related = (a.related ?? []).map(getTemplate).filter((t) => t !== null);

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
                  <em>Fill it in →</em>
                </Link>
              ))}
            </div>
          </>
        )}
        <div className="panel panel-wash" style={{ marginTop: 32 }}>
          <strong>Want someone to walk you through it?</strong>
          <p className="small muted" style={{ margin: "6px 0 12px" }}>
            Our guided hiring service handles the offer, paperwork and first weeks with you.
          </p>
          <Link className="btn btn-small" href="/hiring-help#guided">
            Learn about guided hiring
          </Link>
        </div>
      </div>
    </div>
  );
}
