import Link from "next/link";
import { listThreads } from "@/lib/ownerMessages";
import { requireStaff } from "@/lib/session";
import { refCode } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { BioForm } from "@/components/BioForm";
import { bioFor } from "@/lib/staffBios";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function Messages() {
  const me = await requireStaff();
  const all = me.role === "admin" || me.manager;
  const rows = await listThreads(all ? null : me.id);
  const myBio = me.id ? await bioFor(me.id) : null;
  const now = nowMs();
  const ago = (iso: string) => {
    const h = Math.round((now - Date.parse(iso)) / 36e5);
    return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };
  return (
    <>
      <div className="page-head">
        <h1>Messages from owners</h1>
        <p>Owners who unlocked {all ? "our" : "your"} candidates can ask {all ? "the rep" : "you"} about them. Answer here and they get an email.</p>
      </div>
      {me.id && <BioForm staffId={me.id} line={myBio?.line ?? ""} bio={myBio?.bio ?? ""} self name={me.name} />}
      {rows.length === 0 ? (
        <p className="panel small muted">No messages yet. Once an owner unlocks one of your candidates, they can write to you from the candidate&rsquo;s page, it shows up here and in your email.</p>
      ) : (
        <ul className="msg-list">
          {rows.map((t) => (
            <li key={t.id} className={t.waiting ? "msg-waiting" : ""}>
              <Link href={`/admin/messages/${t.id}`}>
                <span className="msg-who">
                  {t.name}
                  {t.company ? ` · ${t.company}` : ""}
                  {t.waiting && <span className="msg-dot">Waiting for you</span>}
                  {t.cutOff && <span className="msg-closed">Limit reached</span>}
                </span>
                <span className="small muted">
                  About {t.headline ?? t.role ?? "a candidate"} ({refCode(t.candidate_id)}) · {t.count} message{t.count === 1 ? "" : "s"} · {ago(t.last?.at ?? t.at)}
                </span>
                {t.last && <span className="msg-last">{t.last.from === "rep" ? "You: " : ""}{t.last.text.slice(0, 140)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
