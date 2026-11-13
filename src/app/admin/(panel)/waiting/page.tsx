import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { OwnersWaiting } from "../OwnersWaiting";

export const dynamic = "force-dynamic";

export default async function Waiting() {
  const me = await requireStaff();
  if (!me.manager) redirect("/admin");
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <h1>Owners waiting</h1>
        <p>Everyone who asked for a call, who has been called, and the video calls that are booked.</p>
      </div>
      <OwnersWaiting full />
    </>
  );
}
