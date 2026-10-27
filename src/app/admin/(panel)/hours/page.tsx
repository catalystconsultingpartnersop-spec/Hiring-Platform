import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { HoursForm } from "./HoursForm";

export default async function HoursPage() {
  const me = await requireStaff();
  if (!me.id) {
    return (
      <div className="page-head">
        <h1>My hours</h1>
        <p className="notice" style={{ marginTop: 14 }}>
          You&rsquo;re signed in with the admin password, which isn&rsquo;t tied to a person. Sign out and sign back in
          with your email link to set your own hours.
        </p>
      </div>
    );
  }
  const [{ data: rows }, { data: profile }] = await Promise.all([
    db().from("staff_availability").select("weekday, start_minute, end_minute").eq("staff_id", me.id),
    db().from("staff").select("meeting_link, time_zone").eq("id", me.id).maybeSingle(),
  ]);
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>My hours</h1>
        <p>
          When can candidates book a 45-minute onboarding call with you? The site offers these times, skips any you&rsquo;re
          already booked, and needs at least 12 hours&rsquo; notice.
        </p>
      </div>
      <HoursForm
        windows={(rows ?? []) as { weekday: number; start_minute: number; end_minute: number }[]}
        meetingLink={profile?.meeting_link ?? ""}
        timeZone={profile?.time_zone ?? "America/New_York"}
      />
    </div>
  );
}
