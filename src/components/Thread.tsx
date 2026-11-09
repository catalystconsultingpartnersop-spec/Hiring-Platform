import type { Msg } from "@/lib/ownerMessages";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

// A conversation as chat bubbles; "me" is whose side is on the right.
export function Thread({ msgs, me }: { msgs: Msg[]; me: "owner" | "rep" }) {
  return (
    <ol className="thread">
      {msgs.map((m) => (
        <li key={m.id} className={m.from === me ? "thread-mine" : "thread-theirs"}>
          <div className="thread-bubble">
            {m.text.split("\n").map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          <span className="thread-meta">
            {m.by} · {when(m.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}
