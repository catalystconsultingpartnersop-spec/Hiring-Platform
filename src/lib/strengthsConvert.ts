import type { Letter } from "./strengths";

// Results from the earlier nine-strength version, turned into the six as best we can.
// Each earlier strength leans toward one or two of the six; we weight their scores
// accordingly. It's an approximation, so it's marked as converted on their profile.
const LEANS: Record<string, Partial<Record<Letter, number>>> = {
  connect: { E: 0.6, G: 0.4 },
  persuade: { G: 1 },
  help: { E: 1 },
  lead: { G: 0.6, D: 0.4 },
  organize: { T: 0.7, D: 0.3 },
  precision: { T: 0.6, D: 0.4 },
  solve: { W: 0.5, D: 0.5 },
  create: { I: 1 },
  build: { T: 1 },
};

export function convertEarlier(ranked: { key: string; score: number }[]): string | null {
  if (!Array.isArray(ranked) || ranked.length < 6) return null;
  const sum: Record<Letter, number> = { W: 0, I: 0, D: 0, G: 0, E: 0, T: 0 };
  const w: Record<Letter, number> = { W: 0, I: 0, D: 0, G: 0, E: 0, T: 0 };
  for (const r of ranked) {
    for (const [l, k] of Object.entries(LEANS[r.key] ?? {}) as [Letter, number][]) {
      sum[l] += k * r.score;
      w[l] += k;
    }
  }
  const order = (Object.keys(sum) as Letter[]).sort((a, b) => sum[b] / (w[b] || 1) - sum[a] / (w[a] || 1));
  return order.join("");
}
