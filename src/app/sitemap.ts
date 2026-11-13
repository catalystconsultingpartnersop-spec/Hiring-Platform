import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { CAREER_ARTICLES } from "@/lib/careerArticles";
import { listListed } from "@/lib/catalog";
import { siteUrl } from "@/lib/format";

// Every public page, so Google can find the site and show it in search.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  // Each listed candidate's anonymous page.
  const listed = await listListed()
    .then((r) => r.map((c) => c.id))
    .catch(() => [] as string[]);
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${base}${path}`, lastModified: now, priority });
  return [
    page("/", 1),
    page("/join", 0.9),
    page("/candidates", 0.9),
    page("/how-it-works", 0.8),
    page("/billing", 0.5),
    page("/mission", 0.7),
    page("/hiring-help", 0.6),
    page("/apply", 0.6),
    page("/contact", 0.4),
    page("/privacy", 0.2),
    page("/terms", 0.2),
    ...ARTICLES.map((a) => page(`/hiring-help/articles/${a.slug}`, 0.5)),
    ...CAREER_ARTICLES.map((a) => page(`/join/help/${a.slug}`, 0.5)),
    ...listed.map((id) => page(`/candidates/${id}`, 0.6)),
  ];
}
