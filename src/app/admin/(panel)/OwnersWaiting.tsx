import Link from "next/link";
import { declineText, ownerLeads } from "@/lib/ownerLeads";
import { requireStaff } from "@/lib/session";
import { ConfirmButton } from "@/components/ConfirmButton";
import { nowMs } from "@/lib/time";
import { declineBookedCall, markLeadCalled } from "./waiting/actions";
import s from "./waiting/waiting.module.css";

const ago = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60e3));
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) return `${Math.round(m / 60)} hr`;
  return `${Math.round(m / 1440)} days`;
};
const wa = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? `1${d}` : d}`;
};
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

// Business owners waiting to hear from us. Shown to Heshy and Shloimy at the top of
// their home page, and in full on /admin/waiting.
export async function OwnersWaiting({ full = false }: { full?: boolean }) {
  const now = nowMs();
  const { waiting, called, booked, declinedCalls } = await ownerLeads(now);
  const me = await requireStaff();
  if (!full && !waiting.length && !booked.length) return null;
  return (
    <section className={`${s.box} ${waiting.length ? s.hot : ""}`}>
      <div className={s.head}>
        <h2>
          📞 Owners waiting for a call {waiting.length > 0 && <span className={s.count}>{waiting.length}</span>}
        </h2>
        {!full && (
          <Link href="/admin/waiting" className="small">
            See all, and who was called
          </Link>
        )}
      </div>
      {waiting.length === 0 && <p className={s.clear}>✓ Nobody is waiting. Every request has been handled.</p>}
      {waiting.map((l) => {
        const waited = now - Date.parse(l.at);
        return (
          <div key={l.id} className={`${s.row} ${waited > 30 * 60e3 ? s.late : ""}`}>
            <div className={s.who}>
              <b>
                {l.name}
                {l.business ? `, ${l.business}` : ""}
              </b>
              <span>
                Hiring for: {l.role || "not said"} · {l.kind === "callback" ? "asked for a call back" : "asked us to call and set a time"}
              </span>
              <span className={s.wait}>Waiting {ago(waited)}</span>
            </div>
            <div className={s.acts}>
              {l.phone && (
                <>
                  <a className="btn btn-small btn-gold" href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>
                    📞 {l.phone}
                  </a>
                  <a className="btn btn-small btn-ghost" href={wa(l.phone)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </>
              )}
              {l.email && (
                <a className="btn btn-small btn-ghost" href={`mailto:${l.email}`}>
                  Email
                </a>
              )}
              {l.role && (
                <Link className="btn btn-small btn-ghost" href={`/admin/candidates?q=${encodeURIComponent(l.role)}`}>
                  Who fits?
                </Link>
              )}
            </div>
            <form action={markLeadCalled.bind(null, l.id)} className={s.done}>
              <input className="input" name="note" placeholder="Note (optional): what they said" />
              <button className="btn btn-small">✓ I called them</button>
              <button className="btn btn-small btn-ghost" name="outcome" value="declined">
                Not calling back
              </button>
            </form>
          </div>
        );
      })}

      {booked.length > 0 && (
        <>
          <h3 className={s.sub}>📅 Video calls owners booked</h3>
          {booked.map((m) => (
            <div key={m.id} className={s.row}>
              <div className={s.who}>
                <b>
                  {m.name}
                  {m.business ? `, ${m.business}` : ""}
                </b>
                <span>Hiring for: {m.role || "not said"}</span>
                <span className={s.time}>
                  {when(m.starts_at)} · {m.minutes} min{m.phoneCall ? " · wants a phone call" : ""}
                </span>
              </div>
              <div className={s.acts}>
                {m.link && !m.phoneCall && (
                  <a className="btn btn-small btn-gold" href={m.link} target="_blank" rel="noreferrer">
                    Join the call
                  </a>
                )}
                {m.phone && (
                  <a className="btn btn-small btn-ghost" href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}>
                    📞 {m.phone}
                  </a>
                )}
                {m.role && (
                  <Link className="btn btn-small btn-ghost" href={`/admin/candidates?q=${encodeURIComponent(m.role)}`}>
                    Who fits?
                  </Link>
                )}
              </div>
              <details className={s.decline}>
                <summary>Decline this call</summary>
                <form action={declineBookedCall.bind(null, m.id)}>
                  <p className="small muted" style={{ margin: "0 0 6px" }}>
                    {m.email ? `This goes to ${m.email}. Change any word.` : "We have no email for them, so call or text to let them know."} The call comes off the calendar and the time
                    opens up again.
                  </p>
                  <textarea className="textarea" name="message" rows={13} defaultValue={declineText(m.name, me.name || "", new Date(m.starts_at).toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" }))} />
                  <ConfirmButton className="btn btn-small btn-danger" message={`Decline the call with ${m.name}? ${m.email ? "They'll be emailed now." : ""}`}>
                    Send and cancel the call
                  </ConfirmButton>
                </form>
              </details>
            </div>
          ))}
        </>
      )}

      {full && (
        <>
          <h3 className={s.sub}>Handled in the last 7 days</h3>
          {called.length === 0 && <p className="small muted">Nothing yet.</p>}
          {called.map((l) => (
            <div key={l.id} className={`${s.row} ${s.was}`}>
              <div className={s.who}>
                <b>
                  {l.name}
                  {l.business ? `, ${l.business}` : ""}
                </b>
                <span>
                  Hiring for: {l.role || "not said"}
                  {l.phone ? ` · ${l.phone}` : ""}
                </span>
                {l.done!.declined ? (
                  <span className={s.no}>
                    Not called. {l.done!.by.split(" ")[0]} chose not to call back, {when(l.done!.at)}
                  </span>
                ) : (
                  <span className={s.ok}>
                    Called by {l.done!.by.split(" ")[0]}, {when(l.done!.at)} ({ago(Date.parse(l.done!.at) - Date.parse(l.at))} after they asked)
                  </span>
                )}
                {l.done!.note && <span>“{l.done!.note}”</span>}
              </div>
            </div>
          ))}
          {declinedCalls.map((m) => (
            <div key={m.id} className={`${s.row} ${s.was}`}>
              <div className={s.who}>
                <b>
                  {m.name}
                  {m.business ? `, ${m.business}` : ""}
                </b>
                <span>
                  Hiring for: {m.role || "not said"} · video call for {when(m.starts_at)}
                </span>
                <span className={s.no}>
                  Call declined by {m.declined!.by.split(" ")[0]}. {m.email ? "They were emailed." : "No email on file, so let them know by phone."}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
