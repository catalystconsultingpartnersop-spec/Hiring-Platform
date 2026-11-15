"use server";

import { cookies } from "next/headers";
import { addRoleWatch } from "@/lib/roleWatch";

export type TellState = { ok?: boolean; error?: string };

export async function tellMeWhen(_: TellState, fd: FormData): Promise<TellState> {
  if (String(fd.get("website") ?? "")) return { ok: true }; // a robot filled the hidden box
  const ref = (await cookies()).get("tcc_ref")?.value ?? null;
  return addRoleWatch({ role: String(fd.get("role") ?? ""), phone: String(fd.get("phone") ?? ""), ref });
}
