import { createHash } from "crypto";
import { headers } from "next/headers";
import { db } from "./db";

// Who's asking, as a short one-way hash of their IP address (never stored raw).
async function visitor() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}|${process.env.SESSION_SECRET ?? ""}`).digest("base64url").slice(0, 22);
}

// True if this visitor may do this again: at most `max` times in `minutes`.
// If the check itself fails, it lets the request through rather than block real people.
export async function allow(bucket: string, max: number, minutes: number): Promise<boolean> {
  try {
    const who = await visitor();
    const since = new Date(Date.now() - minutes * 60e3).toISOString();
    const { count, error } = await db()
      .from("throttle")
      .select("who", { count: "exact", head: true })
      .eq("bucket", bucket)
      .eq("who", who)
      .gte("at", since);
    if (error) return true;
    if ((count ?? 0) >= max) return false;
    await db().from("throttle").insert({ bucket, who });
    // Now and then, clear out old entries.
    if (Math.random() < 0.02) await db().from("throttle").delete().lt("at", new Date(Date.now() - 2 * 864e5).toISOString());
    return true;
  } catch {
    return true;
  }
}

export const SLOW_DOWN = "You've done that a few times in a row. Please wait a little and try again.";
