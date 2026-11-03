// When a candidate can start. Shown to owners only when it's set (and not "not sure").
export const AVAILABILITY = [
  { value: "now", label: "Right away", tag: "Available now" },
  { value: "2weeks", label: "In about 2 weeks", tag: "Available in 2 weeks" },
  { value: "month", label: "In about a month", tag: "Available in a month" },
  { value: "unsure", label: "Not sure yet", tag: null },
] as const;

export function cleanAvailability(v: unknown): string {
  const s = String(v ?? "").trim();
  return AVAILABILITY.some((a) => a.value === s) ? s : "";
}

export function availabilityLabel(v: string | null | undefined) {
  const a = AVAILABILITY.find((x) => x.value === v);
  return a && a.tag ? a.label : null;
}

export function availabilityTag(v: string | null | undefined) {
  return AVAILABILITY.find((x) => x.value === v)?.tag ?? null;
}
