import Link from "next/link";
import { isMine, listThreads, OVERDUE_HOURS, waitingHours, type ThreadRow } from "@/lib/ownerMessages";
import { requireStaff } from "@/lib/session";
import { db } from "@/lib/db";
import { refCode } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { BioForm } from "@/components/BioForm";
import { bioFor } from "@/lib/staffBios";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function Messages({ searchParams }: PageProps<"/admin/messages">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const oversee = me.role === "admin" || me.manager;
  const all = await listThreads(oversee ? null : me.id);
  const mine = all.filter((t) => isMine(t, me));
  const others = oversee ? all.filter((t) => !isMine(t, me)) : [];
  const tab = sp.view === "team" && oversee ? "team" : "mine";
  const now = nowMs();
  const late = others.filter((t) => waitingHours(t, now) >= OVERDUE_HOURS);
  const bioId = me.role === "admin" ? "heshy" : me.id;
  const myBio = bioId ? await bioFor(bioId) : null;
  const { data: staff } = oversee ? await db().from("staff").select("id, full_name") : { data: [] };
  const repName = new Map((staff ?? []).map((s) => [s.id as string, ((s.full_name as string | null) ?? "Rep").split(" ")[0]]));

  return (
    <>
      <div className="page-head">
        <h1>Messages from owners</h1>
        <p>Owners who unlocked your candidates can ask you about them. Answer here and they get an email.</p>
      </div>
      {bioId && <BioForm staffId={bioId} line={myBio?.line ?? ""} bio={myBio?.bio ?? ""} self name={me.role === "admin" ? "Heshy" : me.name} />}

      {oversee && (
        <nav className="msg-tabs" aria-label="Whose messages">
          <Link href="/admin/messages" aria-current={tab === "mine" ? "page" : undefined}>
            Yours{mine.some((t) => t.waiting) ? ` (${mine.filter((t) => t.waiting).length} waiting)` : ""}
          </Link>
          <Link href="/admin/messages?view=team" aria-current={tab === "team" ? "page" : undefined}>
            Other reps&rsquo; conversations{late.length ? ` (${late.length} waiting over a day)` : ""}
          </Link>
        </nav>
      )}

      {tab === "team" ? (
        <>
          <p className="small muted" style={{ margin: "0 0 12px" }}>
            To keep track, not to answer. Each rep handles their own. If an owner waits more than a day, you&rsquo;ll get an email and can step in.
          </p>
          <List rows={others} now={now} owner={(t) => repName.get(t.staff_id ?? "") ?? "Rep"} empty="No conversations from other reps yet." />
        </>
      ) : (
        <List rows={mine} now={now} empty="No messages yet. Once an owner unlocks one of your candidates, they can write to you from the candidate's page." />
      )}
    </>
  );
}

function List({ rows, now, owner, empty }: { rows: ThreadRow[]; now: number; owner?: (t: ThreadRow) => string; empty: string }) {
  if (!rows.length) return <p className="panel small muted">{empty}</p>;
  const ago = (iso: string) => {
    const h = Math.round((now - Date.parse(iso)) / 36e5);
    return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };
  return (
    <ul className="msg-list">
      {rows.map((t) => {
        const late = waitingHours(t, now) >= OVERDUE_HOURS;
        return (
          <li key={t.id} className={t.waiting ? "msg-waiting" : ""}>
            <Link href={`/admin/messages/${t.id}`}>
              <span className="msg-who">
                {owner && <span className="msg-rep">{owner(t)}&rsquo;s</span>}
                {t.name}
                {t.company ? ` · ${t.company}` : ""}
                {t.waiting && <span className={late ? "msg-late" : "msg-dot"}>{late ? "Waiting over a day" : owner ? "Waiting for the rep" : "Waiting for you"}</span>}
                {t.cutOff && <span className="msg-closed">Limit reached</span>}
              </span>
              <span className="small muted">
                About {t.candidate_name ? `${t.candidate_name}, ` : ""}
                {t.headline ?? t.role ?? "a candidate"} ({refCode(t.candidate_id)}) · {t.count} message{t.count === 1 ? "" : "s"} · {ago(t.last?.at ?? t.at)}
              </span>
              {t.last && <span className="msg-last">{t.last.from === "rep" ? `${t.last.by}: ` : ""}{t.last.text.slice(0, 140)}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
