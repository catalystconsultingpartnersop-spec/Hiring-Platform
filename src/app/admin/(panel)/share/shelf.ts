"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getSetting, setSetting } from "@/lib/settings";

// Heshy takes a poster off everyone's share kit, or puts it back. Nothing is
// deleted: a removed poster waits in "Removed" until it's put back.
export async function setPosterHidden(id: string, hidden: boolean) {
  const me = await requireStaff();
  if (me.role !== "admin") return;
  const key = String(id).slice(0, 60);
  const cur = new Set(await getSetting<string[]>("share_hidden", []));
  if (hidden) cur.add(key);
  else cur.delete(key);
  await setSetting("share_hidden", [...cur]);
  await logActivity(`staff:${me.email}`, hidden ? "share_poster_removed" : "share_poster_restored", { poster: key });
  revalidatePath("/admin/share");
  revalidatePath("/share");
}
