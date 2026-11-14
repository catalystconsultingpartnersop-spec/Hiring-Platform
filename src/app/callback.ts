"use server";

import { fileCallback } from "@/lib/ownerLeads";
import { allow, SLOW_DOWN } from "@/lib/throttle";

export type CallbackState = { ok?: boolean; error?: string; phone?: string };

// The front page's quick ask: the position and a number, and we call back.
// Both leaders get it right away with a one-tap search of the collection, so the
// call can start with who fits (or an honest "no one yet, but we can look").
export async function requestCallback(_: CallbackState, form: FormData): Promise<CallbackState> {
  const t = (k: string, n = 120) => String(form.get(k) ?? "").trim().slice(0, n);
  const role = t("role");
  const name = t("name");
  const phone = t("phone", 40);
  if (!role) return { error: "Tell us the position you're hiring for." };
  if (name.length < 2) return { error: "Add your name." };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Add the number we should call." };
  if (!(await allow("callback", 5, 60))) return { error: SLOW_DOWN };

  await fileCallback({ role, name, phone, from: "home" });
  return { ok: true, phone };
}
