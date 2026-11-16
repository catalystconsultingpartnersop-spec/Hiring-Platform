import type { Fit } from "@/lib/matching";
import type { Judged } from "@/lib/matchJudge";

// The second look (does the person suit the day-to-day?) decides the label once it's in.
export function FitPill({ fit, j }: { fit: Fit; j?: Judged }) {
  const v = j?.v === "strong" || j?.v === "good" ? j.v : fit;
  if (j?.v === "paper") return <span className="tag" title="Matched on role, town, pay and level only">On paper</span>;
  return <span className={`tag ${v === "strong" ? "tag-good" : "tag-gold"}`}>{v === "strong" ? "Strong" : "Good"}</span>;
}
