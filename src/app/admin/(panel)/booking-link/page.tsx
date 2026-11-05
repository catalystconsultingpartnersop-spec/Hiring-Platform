import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { MyBookingLink } from "../MyBookingLink";

export const metadata: Metadata = { title: "My booking link" };
export const dynamic = "force-dynamic";

export default async function BookingLinkPage() {
  const me = await requireStaff();
  if (!me.id) redirect("/admin");
  return (
    <div style={{ maxWidth: 620 }}>
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <h1>My booking link</h1>
      </div>
      <MyBookingLink staffId={me.id} name={me.name} />
    </div>
  );
}
