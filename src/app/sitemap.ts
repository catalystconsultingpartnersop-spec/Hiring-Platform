import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { CAREER_ARTICLES } from "@/lib/careerArticles";
import { TEMPLATES } from "@/lib/templates";
import { siteUrl } from "@/lib/format";

// Every public page, so Google can find the site and show it in search.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${base}${path}`, lastModified: now, priority });
  return [
    page("/", 1),
    page("/join", 0.9),
    page("/candidates", 0.9),
    page("/why", 0.7),
    page("/mission", 0.7),
    page("/hiring-help", 0.6),
    page("/apply", 0.6),
    page("/contact", 0.4),
    page("/privacy", 0.2),
    ...ARTICLES.map((a) => page(`/hiring-help/articles/${a.slug}`, 0.5)),
    ...TEMPLATES.map((t) => page(`/hiring-help/templates/${t.slug}`, 0.4)),
    ...CAREER_ARTICLES.map((a) => page(`/join/help/${a.slug}`, 0.5)),
  ];
}
