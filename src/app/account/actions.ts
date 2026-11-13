"use server";

import { redirect } from "next/navigation";
import { db, logActivity } from "@/lib/db";
import { currentOwner, hashPassword, safeNext } from "@/lib/session";

export type SetupState = { error?: string };

export async function saveSetup(_prev: SetupState, form: FormData): Promise<SetupState> {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  const full_name = String(form.get("full_name") ?? "").trim();
  const company = String(form.get("company") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim() || null;
  if (full_name.length < 2) return { error: "Enter your full name." };
  if (company.length < 2) return { error: "Enter your company name." };
  const password = String(form.get("password") ?? "");
  const update: Record<string, unknown> = { full_name, company, phone };
  if (password) {
    if (password.length < 8) return { error: "Pick a password with at least 8 characters." };
    update.password_hash = hashPassword(password);
  }
  const { error } = await db().from("owners").update(update).eq("id", owner.id);
  if (error) return { error: "Something went wrong saving. Try again." };
  // The "Text me updates" box: on or off, as they left it.
  if (phone) {
    const { setTextConsent, textConsent } = await import("@/lib/sms");
    const want = form.get("text_ok") === "yes";
    if (want !== (await textConsent(phone))) await setTextConsent(phone, want, "owner", "account");
  }
  await logActivity(`owner:${owner.email}`, "profile_saved", { company });
  redirect(safeNext(String(form.get("next") ?? "")));
}

// "Hiring for something specific?": a private position we use to point out candidates who fit.
export async function saveOwnerPosition(_prev: SetupState, form: FormData): Promise<SetupState> {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const title = get("title").slice(0, 120);
  if (title.length < 2) return { error: "What's the position? For example: Office manager." };
  const num = (v: string) => {
    const n = Number(v.replace(/[$,\s]/g, "").replace(/k$/i, "000"));
    return v && Number.isFinite(n) && n > 0 ? Math.round(n < 1000 ? n * 1000 : n) : null;
  };
  const { ROLE_LIST } = await import("@/lib/writingHelp");
  const role = ROLE_LIST.find((r) => title.toLowerCase().includes(r.toLowerCase())) ?? null;
  const { error } = await db()
    .from("positions")
    .insert({
      title,
      company: owner.company,
      location: get("location").slice(0, 120) || null,
      salary_min: num(get("salary_min")),
      salary_max: num(get("salary_max")),
      needs: get("needs").slice(0, 300) || null,
      role_category: role,
      source: "owner",
      owner_id: owner.id,
      contact_name: owner.full_name,
      contact_email: owner.email,
      added_by: `owner:${owner.email}`,
    });
  if (error) return { error: "Couldn't save that just now. Try again in a minute." };
  await logActivity(`owner:${owner.email}`, "position_added", { title, owner_id: owner.id });
  redirect("/account?hiring=saved#hiring");
}

export async function closeOwnerPosition(id: string) {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  await db().from("positions").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", owner.id);
  redirect("/account#hiring");
}
