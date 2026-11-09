import Link from "next/link";
import { notFound } from "next/navigation";
import { getThread } from "@/lib/ownerMessages";
import { requireStaff } from "@/lib/session";
import { refCode } from "@/lib/format";
import { Thread } from "@/components/Thread";
import { PendingButton } from "@/components/PendingButton";
import { reopenOwner, wrapUpConversation } from "../actions";
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
            This conversation is wrapped up. The owner was told politely and can&rsquo;t send more free messages.
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
            <summary>Wrap up this conversation</summary>
            <p className="small muted">
              Sends a polite note that they&rsquo;ve used the free conversation time, explains we give owners the information they need but can&rsquo;t do
              ongoing consulting, and points them to unlock the candidate. They won&rsquo;t be able to send more free messages.
            </p>
            <form action={wrapUpConversation.bind(null, id)}>
              <PendingButton className="btn btn-small btn-ghost" pendingText="Wrapping up…">
                Wrap up politely
              </PendingButton>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
