"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getSetting, setSetting } from "@/lib/settings";

// Heshy or a partner takes a poster off everyone's share kit, or puts it back. Nothing is
// deleted: a removed poster waits in "Removed" until it's put back.
export async function setPosterHidden(id: string, hidden: boolean) {
  const me = await requireStaff();
  if (!me.manager) return;
  const key = String(id).slice(0, 60);
  const cur = new Set(await getSetting<string[]>("share_hidden", []));
  if (hidden) cur.add(key);
  else cur.delete(key);
  await setSetting("share_hidden", [...cur]);
  await logActivity(`staff:${me.email}`, hidden ? "share_poster_removed" : "share_poster_restored", { poster: key });
  revalidatePath("/admin/share");
  revalidatePath("/share");
}

// The small gold label under a poster ("Shloimy recommends", "New"...). Empty
// text means no label.
export async function setPosterLabel(id: string, label: string) {
  const me = await requireStaff();
  if (!me.manager) return;
  const key = String(id).slice(0, 60);
  const text = String(label).trim().slice(0, 30);
  const cur = await getSetting<Record<string, string>>("share_labels", {});
  cur[key] = text;
  await setSetting("share_labels", cur);
  await logActivity(`staff:${me.email}`, "share_poster_label", { poster: key, label: text });
  revalidatePath("/admin/share");
  revalidatePath("/share");
}
