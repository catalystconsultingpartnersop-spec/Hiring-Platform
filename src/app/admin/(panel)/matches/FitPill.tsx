import type { Fit } from "@/lib/matching";

export function FitPill({ fit }: { fit: Fit }) {
  return <span className={`tag ${fit === "strong" ? "tag-good" : "tag-gold"}`}>{fit === "strong" ? "Strong" : "Good"}</span>;
}
