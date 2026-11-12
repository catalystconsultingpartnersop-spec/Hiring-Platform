"use client";

import { useActionState, useState } from "react";
import { sendClientNudge, type NudgeState } from "./actions";
import s from "./client.module.css";

type Option = { kind: string; label: string; subject: string; body: string };

// One tap opens a ready, friendly email. Change any word, then send.
export function NudgeBox({
  ownerId,
  unlockId,
  options,
  suggested,
  recent,
}: {
  ownerId: string;
  unlockId: string | null;
  options: Option[];
  suggested: string | null;
  recent: string | null;
}) {
  const [round, setRound] = useState(0);
  return (
    <NudgeForm
      key={round}
      ownerId={ownerId}
      unlockId={unlockId}
      options={options}
      suggested={suggested}
      recent={recent}
      again={() => setRound((r) => r + 1)}
    />
  );
}

function NudgeForm({
  ownerId,
  unlockId,
  options,
  suggested,
  recent,
  again,
}: {
  ownerId: string;
  unlockId: string | null;
  options: Option[];
  suggested: string | null;
  recent: string | null;
  again: () => void;
}) {
  const [pick, setPick] = useState<Option | null>(null);
  const [state, action, pending] = useActionState<NudgeState, FormData>(
    sendClientNudge,
    {},
  );
  if (state.ok)
    return (
      <p className={s.sent}>
        Sent ✓ Replies come to your email.{" "}
        <button type="button" className={s.linkBtn} onClick={again}>
          Send another
        </button>
      </p>
    );
  const sorted = [...options].sort(
    (a, b) => Number(b.kind === suggested) - Number(a.kind === suggested),
  );
  return (
    <div>
      <div className={s.chips}>
        {sorted.map((o) => (
          <button
            key={o.kind}
            type="button"
            className={`${s.chip} ${o.kind === suggested ? s.chipGold : ""} ${pick?.kind === o.kind ? s.chipOn : ""}`}
            onClick={() => setPick(pick?.kind === o.kind ? null : o)}
          >
            ✉️ {o.label}
          </button>
        ))}
      </div>
      {pick && (
        <form action={action} className={s.nudgeForm}>
          {recent && <p className={s.recent}>{recent}</p>}
          <input type="hidden" name="owner_id" value={ownerId} />
          <input type="hidden" name="unlock_id" value={unlockId ?? ""} />
          <input type="hidden" name="kind" value={pick.kind} />
          <label className="small muted">Subject</label>
          <input
            className="input"
            name="subject"
            defaultValue={pick.subject}
            key={`s${pick.kind}`}
          />
          <label className="small muted">Message (change anything)</label>
          <textarea
            className="input"
            name="body"
            rows={9}
            defaultValue={pick.body}
            key={`b${pick.kind}`}
          />
          {unlockId && (
            <p className="small muted" style={{ margin: 0 }}>
              A button to the candidate&rsquo;s page is added below your
              message. Replies come to you.
            </p>
          )}
          {state.error && (
            <p className="small" style={{ color: "var(--rust)", margin: 0 }}>
              {state.error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-small" disabled={pending}>
              {pending ? "Sending…" : "Send email"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setPick(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
