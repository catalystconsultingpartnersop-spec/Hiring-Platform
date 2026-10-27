import { db } from "./db";

// Small key/value settings Heshy can change from the admin.
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
    if (error || !data) return fallback;
    return data.value as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  return db().from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() });
}

export const DEFAULT_COMMISSION_PERCENT = 10;

export async function commissionPercent() {
  const v = await getSetting<number>("commission_percent", DEFAULT_COMMISSION_PERCENT);
  return typeof v === "number" && v >= 0 && v <= 100 ? v : DEFAULT_COMMISSION_PERCENT;
}
