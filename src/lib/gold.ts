// Gold standard: a rep's own "this one is worth placing" badge. Internal only:
// never shown on the public site or to business owners. Lives in the
// candidate's application data; it stops counting once they're hired or archived.

export type Gold = { by: string; by_name: string; at: string; why?: string | null };

export function goldOf(c: { status: string; application?: Record<string, unknown> | null }): Gold | null {
  if (c.status === "hired" || c.status === "archived") return null;
  const g = c.application?.gold as Gold | undefined;
  return g && g.by ? g : null;
}

// Past this many at once, the rep sees a gentle "keep it rare" note.
export const GOLD_SOFT_LIMIT = 5;
