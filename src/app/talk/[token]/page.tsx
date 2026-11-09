import Link from "next/link";
import { getThread, repFor } from "@/lib/ownerMessages";
import { readSignedToken } from "@/lib/session";
import { refCode } from "@/lib/format";
import { Thread } from "@/components/Thread";
import { OwnerReply } from "./OwnerReply";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your conversation", robots: { index: false } };

// The owner's side of a conversation with a rep, opened from the email link.
export default async function TalkPage({ params }: PageProps<"/talk/[token]">) {
  const { token } = await params;
  const id = readSignedToken(token, "thr_");
  const th = id ? await getThread(id) : null;
  if (!th)
    return (
      <div className="wrap narrow" style={{ padding: "40px 0" }}>
        <h1>This link has expired</h1>
        <p>
          Open the newest email from us, or <Link href="/contact">send us a note</Link>.
        </p>
      </div>
    );
  const rep = th.t.staff_id ? (await repFor(th.t.candidate_id)).first : "Heshy";
  return (
    <div className="wrap narrow talk-page">
      <p className="small">
        <Link href={`/candidates/${th.t.candidate_id}`}>← Back to the candidate</Link>
      </p>
      <h1 style={{ margin: "6px 0 4px" }}>Your conversation with {rep}</h1>
      <p className="muted" style={{ margin: "0 0 18px" }}>
        About “{th.t.headline ?? th.t.role ?? "the candidate"}” ({refCode(th.t.candidate_id)}). {rep} met them in person.
      </p>
      <Thread msgs={th.msgs} me="owner" />
      {th.cutOff ? (
        <div className="rep-call" style={{ marginTop: 18 }}>
          <p className="small" style={{ margin: 0 }}>
            This conversation has wrapped up. When you&rsquo;re ready,{" "}
            <Link href={`/candidates/${th.t.candidate_id}/unlock`}>see who this candidate is</Link> and talk to them directly.
          </p>
        </div>
      ) : (
        <OwnerReply token={token} rep={rep} />
      )}
    </div>
  );
}
