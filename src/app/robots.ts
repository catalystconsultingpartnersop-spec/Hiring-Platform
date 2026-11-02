import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

// What search engines may read. Private pages (team, candidates' own pages,
// accounts, calls) stay out of search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/me", "/call", "/account", "/login", "/auth", "/share", "/strengths"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
