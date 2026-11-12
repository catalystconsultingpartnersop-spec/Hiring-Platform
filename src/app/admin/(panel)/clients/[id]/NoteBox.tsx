"use client";

import { useActionState, useState } from "react";
import { addClientNote, type NudgeState } from "./actions";
import s from "./client.module.css";

export function NoteBox({ ownerId }: { ownerId: string }) {
  const [round, setRound] = useState(0);
  return (
    <NoteForm
      key={round}
      ownerId={ownerId}
      done={() => setRound((r) => r + 1)}
    />
  );
}

function NoteForm({ ownerId, done }: { ownerId: string; done: () => void }) {
  const [state, action, pending] = useActionState<NudgeState, FormData>(
    async (p: NudgeState, f: FormData) => {
      const r = await addClientNote(p, f);
      if (r.ok) done();
      return r;
    },
    {},
  );
  return (
    <form action={action} className={s.noteForm}>
      <input type="hidden" name="owner_id" value={ownerId} />
      <textarea
        className="input"
        name="text"
        rows={2}
        placeholder="Add a note for the team, like what they said on the phone…"
      />
      {state.error && (
        <p className="small" style={{ color: "var(--rust)", margin: 0 }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-ghost btn-small" disabled={pending}>
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
