import { salaryRange } from "./format";
import type { Position } from "./matching";
import type { OpeningProfile } from "./openings";

// What a job poster says by default: the title, where / hours / pay (only what we know),
// and three short lines about who'd be great. The rep can change any of it.
const short = (s: string) => {
  const first = s.split(/[,;:—–(]| and | who | when /)[0].trim().replace(/\.$/, "");
  return first.length > 48 ? first.slice(0, 46).replace(/\s+\S*$/, "") : first;
};
const town = (s: string | null) => (s ?? "").replace(/,?\s*(NY|NJ|New York|New Jersey)\b.*$/i, "").trim() || (s ?? "").trim();

export function jobPosterDefaults(p: Position, prof: OpeningProfile | null) {
  const title = p.title.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
  const meta = [town(p.location), prof?.hours || null, salaryRange(p.salary_min, p.salary_max)].filter(Boolean).join(" · ");
  const lines = (prof?.thrives ?? []).map(short).filter((l) => l.length > 3).slice(0, 3);
  return { title, meta, lines };
}

export function jobCaption(title: string, meta: string, link: string) {
  return `Now hiring: ${title}${meta ? ` (${meta})` : ""}.\n\nLooking for work, or know someone who'd be great for this? Start here, it takes a couple of minutes:\n${link}`;
}
