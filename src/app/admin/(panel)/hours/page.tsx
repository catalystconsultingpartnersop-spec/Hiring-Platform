import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { HoursForm } from "./HoursForm";
import { PhoneForm } from "@/components/PhoneForm";
import { staffPhones } from "@/lib/staffPhones";
import { bookMeSettings, callMinutesByRep, lengthFor, takes } from "@/lib/slots";
import { BookSwitches } from "./BookSwitches";

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
  const [{ data: rows }, { data: profile }, lengths, phones, bookMe] = await Promise.all([
    db().from("staff_availability").select("weekday, start_minute, end_minute").eq("staff_id", me.id),
    db().from("staff").select("meeting_link, time_zone, is_partner").eq("id", me.id).maybeSingle(),
    callMinutesByRep(),
    staffPhones(),
    bookMeSettings(),
  ]);
  const who = { id: me.id, email: me.email, is_partner: (profile as { is_partner?: boolean | null } | null)?.is_partner ?? null };
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>My hours</h1>
        <p>
          When can people book a call with you? Add as many time blocks a day as you like. The site offers these times, skips any
          you&rsquo;re already booked, and needs at least 12 hours&rsquo; notice.
        </p>
      </div>
      <BookSwitches candidates={takes(bookMe, who, "candidates")} owners={takes(bookMe, who, "owners")} showOwners={me.manager} hasHours={(rows ?? []).length > 0} />
      <PhoneForm staffId={me.id} phone={phones[me.id] ?? null} self />
      <HoursForm
        windows={(rows ?? []) as { weekday: number; start_minute: number; end_minute: number }[]}
        meetingLink={profile?.meeting_link ?? ""}
        timeZone={profile?.time_zone ?? "America/New_York"}
        callMinutes={lengthFor(lengths, me.id)}
      />
    </div>
  );
}
