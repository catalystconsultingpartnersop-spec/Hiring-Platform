import { moveCall } from "../../actions";
import styles from "../admin.module.css";

// Managers: move a booked call to another rep, telling the candidate or not.
export function MoveCallForm({ callId, currentRep, reps }: { callId: string; currentRep: string; reps: { id: string; name: string }[] }) {
  return (
    <form action={moveCall.bind(null, callId)} className={styles.inline} style={{ gap: 6, flexWrap: "wrap" }}>
      <select
        className="select"
        name="to"
        defaultValue=""
        aria-label="Move to rep"
        required
        style={{ width: "auto", minHeight: 32, padding: "2px 28px 2px 8px", fontSize: 13 }}
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
      <label className="small" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <input type="checkbox" name="notify" /> email candidate
      </label>
      <button className="btn btn-small btn-ghost" type="submit">
        Move
      </button>
    </form>
  );
}
