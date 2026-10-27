import { getCall } from "@/lib/calls";
import { contactPhone, contactPhoneHref } from "@/lib/format";
import { readSignedToken } from "@/lib/session";
import { openSlots } from "@/lib/slots";
import { isPast } from "@/lib/time";
import { ManageCall } from "./ManageCall";

export const dynamic = "force-dynamic";

// The candidate's own page for their call: see it, join it, move it, cancel it.
export default async function CallPage({ params }: PageProps<"/call/[token]">) {
  const { token } = await params;
  const callId = readSignedToken(token, "call_");
  const call = callId ? await getCall(callId) : null;
  const phone = contactPhone();

  if (!call) {
    return (
      <div className="wrap narrow apply-page">
        <div className="page-head">
          <h1>We couldn&rsquo;t find that call</h1>
          <p>
            The link may have expired. Text or call us at <a href={`sms:${contactPhoneHref()}`}>{phone}</a> and we&rsquo;ll
            sort it out.
          </p>
        </div>
      </div>
    );
  }

  const times = call.status === "booked" || call.status === "cancelled" ? (await openSlots()).map((s) => s.start) : [];
  return (
    <div className="wrap narrow apply-page">
      <ManageCall
        token={token}
        status={call.status}
        start={call.starts_at}
        first={call.candidates.full_name.split(" ")[0]}
        rep={call.staff.full_name || "our team"}
        link={call.staff.meeting_link}
        times={times}
        phone={phone}
        phoneHref={contactPhoneHref()}
        past={isPast(call.starts_at)}
      />
    </div>
  );
}
