"use client";

import { useActionState, useEffect, useState } from "react";
import { editRoomText, type RoomState } from "./actions";
import { MentionText } from "./MentionText";
import s from "./room.module.css";

// A post or reply's words, with @names in bold. Your own can be edited.
export function EditableText({ id, text, edited, mine, names }: { id: number; text: string; edited?: boolean; mine: boolean; names: string[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text);
  const [state, action, pending] = useActionState<RoomState, FormData>(editRoomText.bind(null, id), {});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.ok) setOpen(false);
  }, [state]);
  if (open)
    return (
      <form action={action} className={s.replyForm} style={{ marginTop: 6 }}>
        <MentionText name="text" rows={3} value={draft} onChange={setDraft} placeholder="Your message" names={names} autoFocus />
        {state.error && <p className="notice notice-bad small">{state.error}</p>}
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </span>
      </form>
    );
  return (
    <p className={s.txt}>
      {text.split(/(@[A-Za-z]+)/g).map((part, i) => (part.startsWith("@") ? <b key={i}>{part}</b> : part))}
      {edited && <span className="small muted"> (edited)</span>}
      {mine && (
        <button
          type="button"
          className={s.editBtn}
          onClick={() => {
            setDraft(text);
            setOpen(true);
          }}
        >
          Edit
        </button>
      )}
    </p>
  );
}
