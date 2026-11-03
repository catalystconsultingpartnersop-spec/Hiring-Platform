// The owner page's shape and text helpers, safe to use in the browser too.

export type HandleItem = { icon: string; title: string; detail: string };
export type OwnerPage = { intro: string; handle: HandleItem[]; fit: string[]; years: string; at?: string; by?: string; auto?: boolean };

export function parseOwnerPage(raw: string | null | undefined): OwnerPage | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<OwnerPage>;
    const page: OwnerPage = {
      intro: String(j.intro ?? "").trim(),
      handle: (Array.isArray(j.handle) ? j.handle : [])
        .map((h) => ({ icon: String(h?.icon ?? "").trim().slice(0, 8), title: String(h?.title ?? "").trim(), detail: String(h?.detail ?? "").trim() }))
        .filter((h) => h.title),
      fit: (Array.isArray(j.fit) ? j.fit : []).map((x) => String(x).trim()).filter(Boolean),
      years: String(j.years ?? "").trim(),
      auto: j.auto === true,
      at: j.at,
      by: j.by,
    };
    return page.intro || page.handle.length || page.fit.length ? page : null;
  } catch {
    return null;
  }
}

// ---- The rep's form: plain text in, page out ----

// "✏️ Turn ideas into designs: Takes a rough idea..." → { icon, title, detail }
export function handleFromText(text: string): HandleItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => {
      const m = line.match(/^([^A-Za-z0-9"“'(]{1,8})\s*(.*)$/u);
      const icon = m ? m[1].trim() : "";
      const rest = m ? m[2] : line;
      const i = rest.indexOf(":");
      return i > 0 ? { icon, title: rest.slice(0, i).trim(), detail: rest.slice(i + 1).trim() } : { icon, title: rest.trim(), detail: "" };
    })
    .filter((h) => h.title);
}

export function handleToText(items: HandleItem[]): string {
  return items.map((h) => `${h.icon ? `${h.icon} ` : ""}${h.title}${h.detail ? `: ${h.detail}` : ""}`).join("\n");
}

