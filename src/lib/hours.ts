// Full-time or part-time: kept in the candidate's application ("hours"), no new column.
export const HOURS = [
  ["full", "Full-time"],
  ["part", "Part-time"],
  ["either", "Full or part-time"],
] as const;
export type Hours = (typeof HOURS)[number][0];
export const cleanHours = (v: unknown): Hours | "" => (HOURS.some(([k]) => k === v) ? (v as Hours) : "");
export const hoursLabel = (v: string | null | undefined) => HOURS.find(([k]) => k === v)?.[1] ?? null;
// For filtering: does someone open to "either" count as full-time / part-time? Yes.
export const hoursMatch = (have: string | null | undefined, want: string) => !want || have === want || have === "either";
