import { allListed } from "./catalog";
import { LEVEL_LABEL, siteUrl } from "./format";
import { refSlug, type Kit } from "./shareKit";

// "Just joined" posters: made by the site from candidates who were listed in
// the last two weeks. Only what's already public on their card: role, area,
// level and the one-line headline. Never a name.
const DAY = 864e5;
export const JOINED_DAYS = 14;

export type Joined = { id: string; role: string; meta: string; line: string; listedAt: string };

export async function justJoined(now = Date.now()): Promise<Joined[]> {
  const { rows } = await allListed();
  return rows
    .filter((c) => c.listed_at && now - Date.parse(c.listed_at) <= JOINED_DAYS * DAY && c.role_category)
    .sort((a, b) => String(b.listed_at).localeCompare(String(a.listed_at)))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      role: c.role_category!,
      meta: [c.location_region, c.level ? LEVEL_LABEL[c.level] : null].filter(Boolean).join(" · "),
      line: (c.headline ?? "").trim().replace(/\.$/, ""),
      listedAt: c.listed_at!,
    }));
}

const tagged = (path: string, ref?: string | null) => `${siteUrl()}${path}${ref ? `?r=${refSlug(ref)}` : ""}`;

export async function joinedKits(ref?: string | null): Promise<Kit[]> {
  const list = await justJoined();
  if (!list.length) return [];
  const kits: Kit[] = [];
  const week = list.filter((j) => Date.now() - Date.parse(j.listedAt) <= 7 * DAY).slice(0, 4);
  if (week.length >= 2) {
    const link = tagged("/candidates", ref);
    kits.push({
      id: "joined-week",
      name: "This week's roundup",
      tag: `${week.length} new`,
      about: "Everyone who joined in the last seven days, on one picture.",
      image: "/share/joined/week.png",
      message: `New in The Candidate Collection this week:\n\n${week.map((j) => `• ${j.role}${j.meta ? ` (${j.meta})` : ""}`).join("\n")}\n\nPre-vetted candidates. Handpicked by you.\n\nHiring or not, come take a look: ${link}`,
      link,
    });
  }
  for (const j of list) {
    const link = tagged(`/candidates/${j.id}`, ref);
    kits.push({
      id: `joined-${j.id}`,
      name: j.role,
      about: j.meta || "Just joined",
      image: `/share/joined/${j.id}.png`,
      message: `Just joined The Candidate Collection:\n\n${j.role}${j.meta ? `, ${j.meta}` : ""}.${j.line ? `\n${j.line}.` : ""}\n\nPre-vetted candidates. Handpicked by you.\n\nSee the profile: ${link}`,
      link,
    });
  }
  return kits;
}
