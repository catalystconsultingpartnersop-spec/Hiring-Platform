import { listPointed } from "@/lib/pointed";
import { COMPANY_TZ } from "@/lib/time";
import { FollowUpText } from "./FollowUpText";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: COMPANY_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const how = (ch: string) => (ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "Text");

// Who this candidate was suggested to: did it go out, did they open it, where the
// conversation is, and a one-tap follow-up.
export async function Suggested({ candidateId, link, repFirst, first, myEmail }: { candidateId: string; link: string; repFirst: string; first: string; myEmail: string }) {
  const people = await listPointed(candidateId);
  if (!people.length) return null;
  return (
    <section id="suggested" className="panel" style={{ marginTop: 10, padding: "14px 18px" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>
        Suggested to {people.length} {people.length === 1 ? "person" : "people"}
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {people.map((p) => {
          const lastSend = p.sends[p.sends.length - 1];
          const firstName = p.name.split(" ")[0];
          const follow = `Hi ${firstName}, did you get a chance to look at the profile I sent you? ${link}${p.lastToken ? `${link.includes("?") ? "&" : "?"}s=${p.lastToken}` : ""}\n${repFirst}`;
          const digits = p.key.replace(/\D/g, "");
          const intl = digits.length === 10 ? `1${digits}` : digits;
          const where =
            lastSend.channel === "email"
              ? `Emailed from the site in ${lastSend.by === repFirst ? "your" : `${lastSend.by}'s`} name. Replies go to ${lastSend.by === repFirst ? `your inbox (${myEmail})` : `${lastSend.by}'s inbox`}.`
              : `${lastSend.by === repFirst ? "Your" : `${lastSend.by}'s`} ${lastSend.channel === "whatsapp" ? "WhatsApp" : "Messages app"} opened with the message. If it was sent, the conversation is there.`;
          return (
            <div key={p.key} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <b>{p.name}</b>
                <span className="small muted">{p.isEmail ? p.key : p.key.length === 10 ? `(${p.key.slice(0, 3)}) ${p.key.slice(3, 6)}-${p.key.slice(6)}` : p.key}</span>
                {p.signedAt ? (
                  <span className="tag" style={{ background: "#e7f4ea", color: "#1f4a31" }}>✓ Signed for {first}</span>
                ) : p.openedAt ? (
                  <span className="tag" style={{ background: "#fff3cf", color: "#5a4300" }}>
                    👀 Opened the profile {when(p.openedAt)}
                    {p.opens > 1 ? ` (${p.opens} times)` : ""}
                  </span>
                ) : p.tracked ? (
                  <span className="tag">Not opened yet</span>
                ) : null}
              </div>
              <div className="small muted" style={{ marginTop: 3 }}>
                Suggested: {p.sends.map((s) => `${how(s.channel)} by ${s.by}, ${when(s.at)}`).join(" · ")}
              </div>
              <div className="small" style={{ marginTop: 3 }}>{where}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {p.isEmail ? (
                  <a className="btn btn-ghost btn-small" href={`mailto:${p.key}?subject=${encodeURIComponent("Following up on the profile I sent")}&body=${encodeURIComponent(follow)}`}>
                    Follow up by email
                  </a>
                ) : (
                  <>
                    <a className="btn btn-ghost btn-small" href={`https://wa.me/${intl}?text=${encodeURIComponent(follow)}`} target="_blank" rel="noreferrer">
                      Follow up on WhatsApp
                    </a>
                    <FollowUpText intl={intl} body={follow} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        You get an email the first time someone opens a profile you suggested.
      </p>
    </section>
  );
}
