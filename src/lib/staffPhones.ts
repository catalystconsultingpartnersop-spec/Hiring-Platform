import { getSetting, setSetting } from "./settings";

// Reps' mobile numbers (for texts later on). Kept in settings, by staff id.
const KEY = "staff_phones";

export async function staffPhones(): Promise<Record<string, string>> {
  return getSetting<Record<string, string>>(KEY, {});
}

export function cleanPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length !== 10) return null;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export async function setStaffPhone(staffId: string, phone: string | null) {
  const cur = await staffPhones();
  if (phone) cur[staffId] = phone;
  else delete cur[staffId];
  await setSetting(KEY, cur);
}
