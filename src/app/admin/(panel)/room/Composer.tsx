"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Kind, RoomCand } from "@/lib/teamRoom";
import { postToRoom, replyToPost, type RoomState } from "./actions";
import { Picker } from "./Picker";
import { MentionText } from "./MentionText";
import s from "./room.module.css";

const TABS: [Kind, string, string][] = [
  ["spotlight", "⭐ Spotlight a candidate", "Who did you meet? What makes them great?"],
  ["looking", "🔎 Looking for…", "What does the owner need? Role, town, pay, when. Who has someone?"],
  ["talk", "💬 Just talk", "A question, a tip, a win…"],
];

export function Composer({ cands, meId, spot, names }: { cands: RoomCand[]; meId: string | null; spot: string | null; names: string[] }) {
  const [kind, setKind] = useState<Kind>(spot ? "spotlight" : "spotlight");
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>(spot ? [spot] : []);
  const [state, action, pending] = useActionState<RoomState, FormData>(postToRoom, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText("");
      setPicked([]);
    }
  }, [state]);
  const tab = TABS.find((t) => t[0] === kind)!;
  return (
    <form ref={form} action={action} className={`${s.card} ${s.compose}`}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="cands" value={picked.join(",")} />
      <div className={s.tabs} role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={k === kind} className={k === kind ? s.tabOn : ""} onClick={() => setKind(k)}>
            {l}
          </button>
        ))}
      </div>
      <MentionText name="text" rows={3} value={text} onChange={setText} placeholder={tab[2]} names={names} />
      <div className={s.composeRow}>
        <Picker cands={cands} meId={meId} context={kind === "looking" ? text : ""} value={picked} onChange={setPicked} />
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        Tip: type @ to pick someone, or @all to let the whole team know.
      </p>
    </form>
  );
}

export function ReplyBox({ postId, cands, meId, context, names }: { postId: number; cands: RoomCand[]; meId: string | null; context: string; names: string[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [state, action, pending] = useActionState<RoomState, FormData>(replyToPost.bind(null, postId), {});
  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText("");
      setPicked([]);
      setOpen(false);
    }
  }, [state]);
  if (!open)
    return (
      <button type="button" className={s.act} onClick={() => setOpen(true)}>
        💬 Reply or attach a candidate
      </button>
    );
  return (
    <form action={action} className={s.replyForm}>
      <input type="hidden" name="cands" value={picked.join(",")} />
      <MentionText name="text" rows={2} value={text} onChange={setText} placeholder="Write a reply… (type @ to tag someone)" names={names} autoFocus />
      <div className={s.composeRow}>
        <Picker cands={cands} meId={meId} context={context} value={picked} onChange={setPicked} />
        <span style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Reply"}
          </button>
        </span>
      </div>
      {state.error && <p className="notice notice-bad small">{state.error}</p>}
    </form>
  );
}
