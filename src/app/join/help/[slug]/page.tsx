import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CAREER_ARTICLES, getCareerArticle } from "@/lib/careerArticles";
import { brandName } from "@/lib/format";
import { markupToHtml } from "@/lib/markup";
import styles from "../../../hiring-help/help.module.css";

export async function generateMetadata({ params }: PageProps<"/join/help/[slug]">): Promise<Metadata> {
  const a = getCareerArticle((await params).slug);
  return a ? { title: `${a.title} | ${brandName()}`, description: a.blurb } : {};
}

export function generateStaticParams() {
  return CAREER_ARTICLES.map((a) => ({ slug: a.slug }));
}

// Career help for job seekers. Open to everyone, no sign-in.
export default async function CareerArticlePage({ params }: PageProps<"/join/help/[slug]">) {
  const { slug } = await params;
  const a = getCareerArticle(slug);
  if (!a) notFound();
  const more = CAREER_ARTICLES.filter((x) => x.slug !== slug).slice(0, 3);

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <div className={styles.article}>
        <Link href="/join" className="small muted">
          Career help
        </Link>
        <h1>{a.title}</h1>
        <p className="muted" style={{ fontSize: 18, margin: "0 0 24px" }}>
          {a.blurb} <span className="small">· {a.minutes} min read</span>
        </p>
        <div className={styles.doc} dangerouslySetInnerHTML={{ __html: markupToHtml(a.body) }} />

        <div className="panel" style={{ marginTop: 32, background: "#fff8e1", borderColor: "#f3dd94" }}>
          <strong>Want help finding work that fits you?</strong>
          <p className="small muted" style={{ margin: "6px 0 12px" }}>
            It&rsquo;s free. We sit down with you, learn what you&rsquo;re great at, and introduce you to employers who
            need exactly that.
          </p>
          <Link className="btn btn-gold btn-small" href="/apply">
            Join the Collection
          </Link>
        </div>

        <h2 className={styles.h2}>More career help</h2>
        <div className={styles.grid}>
          {more.map((m) => (
            <Link key={m.slug} href={`/join/help/${m.slug}`} className={styles.tile}>
              <strong>{m.title}</strong>
              <span>{m.blurb}</span>
              <em>Read →</em>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
