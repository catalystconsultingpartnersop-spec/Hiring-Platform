// Languages a candidate speaks fluently. The common ones are one tap; anything else can be typed.
export const LANGUAGES = ["English", "Yiddish", "Hebrew", "Spanish", "Russian", "French"];

export function cleanLanguages(list: unknown[]): string[] {
  const out: string[] = [];
  for (const raw of list.flatMap((x) => String(x ?? "").split(/[,\n]/))) {
    const t = raw.trim().slice(0, 30);
    if (!t) continue;
    const name = LANGUAGES.find((l) => l.toLowerCase() === t.toLowerCase()) ?? t.charAt(0).toUpperCase() + t.slice(1);
    if (!out.some((o) => o.toLowerCase() === name.toLowerCase())) out.push(name);
  }
  return out.slice(0, 8);
}

// "English", "English and Yiddish", "English, Yiddish and Spanish"
export function languagesText(list: string[] | null | undefined): string | null {
  const l = list ?? [];
  if (!l.length) return null;
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`;
}
