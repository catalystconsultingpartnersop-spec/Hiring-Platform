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
  await logActivity(`owner:${owner.email}`, "profile_saved", { company });
  redirect(safeNext(String(form.get("next") ?? "")));
}
