import Link from "next/link";
import { notFound } from "next/navigation";
import { getThread } from "@/lib/ownerMessages";
import { requireStaff } from "@/lib/session";
import { refCode } from "@/lib/format";
import { Thread } from "@/components/Thread";
import { PendingButton } from "@/components/PendingButton";
import { reopenOwner, limitOwner } from "../actions";
import { RepAnswer } from "./RepAnswer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation" };

export default async function Conversation({ params }: PageProps<"/admin/messages/[id]">) {
  const { id } = await params;
  const me = await requireStaff();
  const th = await getThread(id);
  if (!th) notFound();
  if (me.role !== "admin" && !me.manager && th.t.staff_id !== me.id) notFound();
  const { t } = th;
  return (
    <div style={{ maxWidth: 760, paddingBottom: 48 }}>
      <p className="small" style={{ marginTop: 18 }}>
        <Link href="/admin/messages">← All messages</Link>
      </p>
      <div className="page-head" style={{ paddingTop: 6 }}>
        <h1>
          {t.name}
          {t.company ? `, ${t.company}` : ""}
        </h1>
        <p>
          About <Link href={`/admin/candidates/${t.candidate_id}`}>{t.headline ?? t.role ?? "the candidate"}</Link> ({refCode(t.candidate_id)})
          {t.phone && (
            <>
              {" "}
              · <a href={`tel:${t.phone.replace(/[^\d+]/g, "")}`}>{t.phone}</a>
            </>
          )}{" "}
          · {t.email}
        </p>
      </div>
      <Thread msgs={th.msgs} me="rep" />
      {th.cutOff ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <p className="small" style={{ margin: 0 }}>
            This owner reached the limit. They were told politely and can&rsquo;t send more messages. The conversation stays here.
          </p>
          {me.role === "admin" && (
            <form action={reopenOwner.bind(null, id)} style={{ marginTop: 10 }}>
              <PendingButton className="btn btn-small btn-ghost" pendingText="Reopening…">
                Reopen for this owner
              </PendingButton>
            </form>
          )}
        </div>
      ) : (
        <>
          <RepAnswer threadId={id} />
          <details className="wrapup">
            <summary>Owner taking advantage? Set a limit</summary>
            <p className="small muted">
              Only for owners who are overdoing it. Most owners should never get this. It sends a polite note that they&rsquo;ve reached the limit of
              free conversation: we give owners the information they need to decide, but we&rsquo;re limited in how much ongoing consulting and coaching we
              can do. It points them to unlock the candidate, and they can&rsquo;t send more messages. The conversation history stays.
            </p>
            <form action={limitOwner.bind(null, id)}>
              <PendingButton className="btn btn-small btn-ghost" pendingText="Sending…">
                Send the limit note
              </PendingButton>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
