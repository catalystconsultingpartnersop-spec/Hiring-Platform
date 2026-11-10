import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { loadRoom, roomCandidates, SPECIALTY_LABEL, specialties, teamMembers, codesIn, type RoomCand, type RoomPost } from "@/lib/teamRoom";
import { Composer, ReplyBox } from "./Composer";
import { AgendaEdit, CallBox } from "./CallBox";
import { allNotes, googleCalendarLink, nextCall, teamCalls } from "@/lib/teamCalls";
import { COMPANY_TZ, formatInZone } from "@/lib/time";
import { cancelTeamCall, removePost, setRoomEmailPref, setSpecialty } from "./actions";
import { markRoomSeen, roomEmailPrefs } from "@/lib/roomNotify";
import { after } from "next/server";
import s from "./room.module.css";

export const metadata = { title: "Team Room" };

const COLORS = ["#2d5bd7", "#2f6b47", "#b4412f", "#6b4a2f", "#7a4fa0", "#0f7c86"];
const color = (n: string) => COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function ago(at: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(at)) / 60e3));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function Text({ t }: { t: string }) {
  // @Names in bold; everything else as written.
  return (
    <p className={s.txt}>
      {t.split(/(@[A-Za-z]+)/g).map((part, i) => (part.startsWith("@") ? <b key={i}>{part}</b> : part))}
    </p>
  );
}

function Card({ c }: { c: RoomCand }) {
  return (
    <Link prefetch={false} href={`/admin/candidates/${c.id}`} className={s.cc}>
      <span className={s.ccFace} style={{ background: c.gold ? "#ffe08a" : "#eef1f6" }}>
        {c.first.slice(0, 1)}
      </span>
      <span className={s.ccText}>
        <b>{c.headline}</b>
        <span>
          {c.first} · {c.repFirst ? `${c.repFirst}'s` : "No rep yet"} · {c.sub}
          {c.status === "hired" ? " · Hired" : ""}
        </span>
      </span>
      {c.gold && <span className={s.goldTag}>⭐ Gold</span>}
    </Link>
  );
}

const KIND_TAG: Record<string, [string, string]> = {
  spotlight: ["⭐ Spotlight", s.kSpot],
  looking: ["🔎 Looking for", s.kLook],
  talk: ["💬", s.kTalk],
};

export default async function TeamRoom({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const [posts, cands, spec, team, calls, notes, emailPrefs] = await Promise.all([loadRoom(), roomCandidates(), specialties(), teamMembers(), teamCalls(), allNotes(), roomEmailPrefs()]);
  const names = [...new Set(team.filter((t) => t.email !== me.email).map((t) => t.name.split(" ")[0]))];
  // Opening the room clears the unread count on the menu.
  after(() => markRoomSeen(me.email).catch(() => null));
  const byId = new Map(cands.map((c) => [c.id, c]));
  const cardsFor = (ids: string[], text: string) => {
    const codes = codesIn(text);
    const extra = codes.length ? cands.filter((c) => codes.some((k) => c.id.replace(/-/g, "").endsWith(k))).map((c) => c.id) : [];
    return [...new Set([...ids, ...extra])].map((id) => byId.get(id)).filter((c): c is RoomCand => !!c);
  };
  const now = nowMs();
  const next = nextCall(calls, now);
  const goodNotes = notes.filter((n) => !n.failed);
  const last = goodNotes[0] ?? null;
  // Call notes go in the feed too.
  const feed: RoomPost[] = [
    ...posts,
    ...goodNotes.map((n) => ({ id: -2e12 - n.id, at: n.at, kind: "auto_notes" as RoomPost["kind"], byName: "", byEmail: "", text: n.title, cands: n.cands, replies: [], notes: n })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const spot = typeof sp.spot === "string" && byId.has(sp.spot) ? sp.spot : null;
  const nameOf = (email: string) => team.find((t) => t.email === email);
  const specOf = (email: string) => {
    const m = nameOf(email);
    return m && spec[m.id] ? SPECIALTY_LABEL[spec[m.id]] : null;
  };

  const callCard = next ? (
<div className={s.call}>
            <span className={s.callLab}>{Date.parse(next.starts_at) <= now ? "Happening now" : "Next team call"}</span>
            <h3>{formatInZone(next.starts_at, COMPANY_TZ, { month: undefined, day: undefined })}</h3>
            <p>
              {next.title} · {next.minutes} min{next.space ? " · recorded, notes sent after" : ""}
              <br />
              {formatInZone(next.starts_at, COMPANY_TZ, { weekday: undefined, hour: undefined, minute: undefined, timeZoneName: undefined })} · set up by {next.by_name.split(" ")[0]}
            </p>
            {next.agenda.length > 0 && (
              <div className={s.agenda}>
                <b>Agenda</b>
                <ol>
                  {next.agenda.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
            )}
            <span className={s.callRow}>
              <a className="btn btn-gold btn-small" href={next.link} target="_blank" rel="noreferrer">
                Join the call
              </a>
              <a href={googleCalendarLink(next)} target="_blank" rel="noreferrer">
                Add to calendar
              </a>
            </span>
            <AgendaEdit key={next.agenda.join("|")} callId={next.id} agenda={next.agenda} />
            {(me.manager || next.by_name === me.name) && (
              <form action={cancelTeamCall.bind(null, next.id)} style={{ marginTop: 8 }}>
                <button type="submit" className={s.callCancel}>
                  Cancel this call
                </button>
              </form>
            )}
          </div>
  ) : null;

  const post = (p: RoomPost & { notes?: (typeof notes)[number] }) => {
    if (p.kind === "auto_notes" && p.notes) {
      const n = p.notes;
      return (
        <article key={p.id} id={`n${n.id}`} className={s.card}>
          <div className={s.who}>
            <span className={s.av} style={{ background: "var(--ink)" }}>
              📝
            </span>
            <div>
              <b>Notes from the team call: {n.title}</b>
              <small>Written automatically · {ago(p.at, now)}</small>
            </div>
            <span className={`${s.kind} ${s.kTalk}`}>Notes</span>
          </div>
          <ul className={s.notes}>
            {n.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {n.actions.length > 0 && (
            <>
              <p className="small" style={{ margin: "8px 0 4px", fontWeight: 700 }}>
                Who&rsquo;s doing what
              </p>
              <ul className={s.notes}>
                {n.actions.map((a, i) => (
                  <li key={i}>
                    <b>{a.who}:</b> {a.what}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className={s.cards}>
            {n.cands.map((id) => byId.get(id)).filter((c): c is RoomCand => !!c).map((c) => (
              <Card key={c.id} c={c} />
            ))}
          </div>
        </article>
      );
    }
    if (p.kind === "auto_hire") {
      const c = byId.get(p.cands[0]);
      return (
        <article key={p.id} className={`${s.card} ${s.win}`}>
          <div className={s.who}>
            <span className={s.av} style={{ background: "var(--moss)" }}>
              🎉
            </span>
            <div>
              <b>A hire!</b>
              <small>Posted automatically · {ago(p.at, now)}</small>
            </div>
            <span className={`${s.kind} ${s.kWin}`}>Win</span>
          </div>
          <p className={s.txt} style={{ margin: 0 }}>
            <b>{c?.first ?? "A candidate"}</b> was hired{p.text ? ` by ${p.text}` : ""}.{c?.repFirst ? <> Thanks to <b>{c.repFirst}</b>!</> : null} Mazel tov! 🎉
          </p>
        </article>
      );
    }
    if (p.kind === "auto_gold") {
      const c = byId.get(p.cands[0]);
      return (
        <article key={p.id} className={s.card}>
          <div className={s.who}>
            <span className={s.av} style={{ background: "var(--marigold)", color: "var(--ink)" }}>
              ⭐
            </span>
            <div>
              <b>New gold standard candidate</b>
              <small>Posted automatically · {ago(p.at, now)}</small>
            </div>
            <span className={`${s.kind} ${s.kTalk}`}>Auto</span>
          </div>
          <p className={s.txt}>
            {p.byName.split(" ")[0]} marked a candidate as gold{p.text ? `: “${p.text}”` : "."}
          </p>
          {c && <Card c={c} />}
        </article>
      );
    }
    const [tag, cls] = KIND_TAG[p.kind] ?? KIND_TAG.talk;
    const mine = p.byEmail === me.email;
    return (
      <article key={p.id} id={`p${p.id}`} className={s.card}>
        <div className={s.who}>
          <span className={s.av} style={{ background: color(p.byName) }}>
            {p.byName.slice(0, 1)}
          </span>
          <div>
            <b>{p.byName}</b>
            <small>
              {specOf(p.byEmail) ? `${specOf(p.byEmail)} · ` : ""}
              {ago(p.at, now)}
            </small>
          </div>
          <span className={`${s.kind} ${cls}`}>{tag}</span>
        </div>
        <Text t={p.text} />
        <div className={s.cards}>
          {cardsFor(p.cands, p.text).map((c) => (
            <Card key={c.id} c={c} />
          ))}
        </div>
        {p.replies.map((r) => (
          <div key={r.id} className={s.reply}>
            <div className={s.who}>
              <span className={s.av} style={{ background: color(r.byName), width: 30, height: 30, fontSize: 12 }}>
                {r.byName.slice(0, 1)}
              </span>
              <div>
                <b>{r.byName}</b>
                <small>{ago(r.at, now)}</small>
              </div>
            </div>
            {r.text && <Text t={r.text} />}
            <div className={s.cards}>
              {cardsFor(r.cands, r.text).map((c) => (
                <Card key={c.id} c={c} />
              ))}
            </div>
          </div>
        ))}
        <div className={s.acts}>
          <ReplyBox postId={p.id} cands={cands} meId={me.id} context={p.kind === "looking" ? p.text : ""} names={names} />
          {(mine || me.manager) && (
            <form action={removePost.bind(null, p.id)}>
              <button type="submit" className={s.act}>
                Remove
              </button>
            </form>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className={s.layout}>
      <div>
        <div className="page-head" style={{ paddingBottom: 6 }}>
          <h1>Team Room</h1>
          <p>Spotlight great candidates, ask who has someone, and celebrate the wins. Only our team sees this.</p>
        </div>
        {next ? <div className={s.mobileOnly}>{callCard}</div> : null}
        <Composer cands={cands} meId={me.id} spot={spot} names={names} />
        {feed.length === 0 ? <p className="panel panel-wash">Nothing here yet. Be the first: spotlight someone great you met.</p> : feed.map(post)}
      </div>
      <aside className={s.side}>
        {next ? <div className={s.desktopOnly}>{callCard}</div> : null}
        {last && (
          <div className={s.card}>
            <h3>📝 Last call&rsquo;s notes</h3>
            <p className="small muted" style={{ margin: "0 0 8px" }}>
              {last.title} · made automatically
            </p>
            <ul className={s.notes}>
              {last.bullets.slice(0, 4).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <a className="small" href={`#n${last.id}`} style={{ fontWeight: 700 }}>
              Read the full notes
            </a>
          </div>
        )}
        <div className={s.card}>
          <h3>The team</h3>
          {team.map((t) => (
            <div key={t.id} className={s.member}>
              <span className={s.av} style={{ background: color(t.name), width: 30, height: 30, fontSize: 12 }}>
                {t.name.slice(0, 1)}
              </span>
              <b>{t.name.split(" ")[0]}</b>
              {spec[t.id] && <span className={`${s.spec} ${s["sp_" + spec[t.id]]}`}>{SPECIALTY_LABEL[spec[t.id]]}</span>}
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <CallBox team={team} meId={me.id} />
          </div>
          {me.id && (
            <form action={setSpecialty} className={s.specForm}>
              <label className="small" htmlFor="spec">
                Your specialty
              </label>
              <span style={{ display: "flex", gap: 6 }}>
                <select id="spec" name="specialty" className="select" defaultValue={spec[me.id] ?? ""}>
                  <option value="">Not set</option>
                  <option value="candidates">Candidates</option>
                  <option value="owners">Business owners</option>
                  <option value="both">Both</option>
                </select>
                <button className="btn btn-small btn-ghost" type="submit">
                  Save
                </button>
              </span>
            </form>
          )}
        </div>
        <form action={setRoomEmailPref} className={s.card}>
          <h3>Email me</h3>
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
            <input type="radio" name="room_email" value="all" defaultChecked={emailPrefs[me.email.toLowerCase()] !== "mine"} /> Every new post, plus replies to mine and when I&rsquo;m tagged
          </label>
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            <input type="radio" name="room_email" value="mine" defaultChecked={emailPrefs[me.email.toLowerCase()] === "mine"} /> Only replies to my posts and when I&rsquo;m tagged
          </label>
          <button className="btn btn-small btn-ghost" type="submit">
            Save
          </button>
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Replies in a conversation you&rsquo;re in always come to you. Plus one short summary a day. The menu shows a number when there&rsquo;s something new.
          </p>
        </form>
      </aside>
    </div>
  );
}
