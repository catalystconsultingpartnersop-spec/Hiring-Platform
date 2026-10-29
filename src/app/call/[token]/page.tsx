import { getCall } from "@/lib/calls";
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

  if (!call) {
    return (
      <div className="wrap narrow apply-page">
        <div className="page-head">
          <h1>We couldn&rsquo;t find that call</h1>
          <p>
            The link may have expired. <a href="/contact?kind=work">Send us a note</a> and we&rsquo;ll sort it out.
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
        past={isPast(call.starts_at)}
      />
    </div>
  );
}
