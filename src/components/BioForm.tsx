"use client";

import { useActionState } from "react";
import { saveBio } from "@/app/admin/(panel)/messages/actions";

// A rep's bio for owners (on Messages for themselves; on Heshy's view of a rep).
export function BioForm({ staffId, line, bio, self, name }: { staffId: string; line: string; bio: string; self: boolean; name: string }) {
  const [state, action, pending] = useActionState(saveBio.bind(null, staffId), null);
  const first = name.split(" ")[0];
  return (
    <form action={action} className="panel" id="bio" style={{ marginBottom: 18, scrollMarginTop: 16 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 800 }}>{self ? "Your bio for business owners" : `${first}'s bio for business owners`}</p>
      <p className="small muted" style={{ margin: "0 0 12px" }}>
        Owners see this when they unlock one of {self ? "your" : "their"} candidates, next to &ldquo;Talk to {first}.&rdquo; Tell them who {self ? "you are" : `${first} is`} and why {self ? "your" : "their"} read on a candidate is worth hearing.
      </p>
      <label className="field">
        <span>One line</span>
        <input className="input" name="line" maxLength={90} defaultValue={line} placeholder="e.g. 15 years running operations teams in construction" />
      </label>
      <label className="field">
        <span>A few sentences</span>
        <textarea
          className="textarea"
          name="bio"
          rows={4}
          maxLength={600}
          defaultValue={bio}
          placeholder="e.g. I've hired and managed crews of 40+ and know what holds up on a job site. I sat down with every candidate I list, and I'll tell you honestly where they'll shine."
        />
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-gold btn-small" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.ok && <span className="small" style={{ color: "var(--moss)" }}>Saved ✓</span>}
        {state && !state.ok && <span className="notice notice-bad small">{state.error}</span>}
      </div>
    </form>
  );
}
