"use server";

import { cleanInvite, DEFAULT_INVITE } from "@/lib/repInvite";
import { requireAdmin } from "@/lib/session";
import { setSetting } from "@/lib/settings";

// Keeps Heshy's edited wording so the next invitation starts from it.
export async function saveInviteWording(json: string) {
  await requireAdmin();
  let raw: unknown = null;
  try {
    raw = JSON.parse(json);
  } catch {
    return { error: "Couldn't read the wording. Try again." };
  }
  const { error } = await setSetting("rep_invite", cleanInvite(raw));
  return error ? { error: "Couldn't save just now. Try again." } : { ok: "Saved. Your next invitation starts with this wording." };
}

export async function resetInviteWording() {
  await requireAdmin();
  await setSetting("rep_invite", DEFAULT_INVITE);
  return DEFAULT_INVITE;
}
