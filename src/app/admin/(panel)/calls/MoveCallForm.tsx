import { moveCall } from "../../actions";

// Managers: move a booked call to another rep, telling the candidate or not.
export function MoveCallForm({ callId, currentRep, reps }: { callId: string; currentRep: string; reps: { id: string; name: string }[] }) {
  return (
    <form action={moveCall.bind(null, callId)} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select
        className="select"
        name="to"
        defaultValue=""
        aria-label="Move to rep"
        required
        style={{ width: "auto", minHeight: 34, padding: "2px 28px 2px 10px", fontSize: 13.5 }}
      >
        <option value="" disabled>
          Move to…
        </option>
        {reps
          .filter((s) => s.id !== currentRep)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13.5, whiteSpace: "nowrap", margin: 0, fontWeight: 500 }}>
        <input type="checkbox" name="notify" style={{ width: 16, height: 16, margin: 0, minHeight: 0 }} /> Email them
      </label>
      <button className="btn btn-small btn-ghost" type="submit">
        Move
      </button>
    </form>
  );
}
