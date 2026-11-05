import { db } from "@/lib/db";
import { candidateUrl } from "@/lib/format";
import { refSlug } from "@/lib/shareKit";
import { BookingLink } from "./BookingLink";

// The signed-in person's own booking link card (reps, partners and the owner).
export async function MyBookingLink({ staffId, name }: { staffId: string; name: string }) {
  const first = name.split(" ")[0];
  const { count } = await db().from("staff_availability").select("staff_id", { count: "exact", head: true }).eq("staff_id", staffId);
  return <BookingLink link={`${candidateUrl()}/book/${refSlug(first)}`} first={first} hasHours={!!count} />;
}
