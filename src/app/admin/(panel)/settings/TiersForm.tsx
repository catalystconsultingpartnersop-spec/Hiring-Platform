"use client";

import { useActionState } from "react";
import type { FeeTier } from "@/lib/db";
import { FormState, saveTiers } from "../../actions";

export function TiersForm({ tiers, removeTier }: { tiers: FeeTier[]; removeTier: (id: string) => Promise<void> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTiers, {});
  return (
    <>
      <form action={action}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Salary up to ($)</th>
                <th>Fee ($)</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => {
                const last = i === tiers.length - 1;
                return (
                  <tr key={t.id}>
                    <td>
                      <input type="hidden" name="tier_id" value={t.id} />
                      {last ? (
                        <>
                          <input type="hidden" name="max_salary" value="" />
                          <span className="muted">Everything above</span>
                        </>
                      ) : (
                        <input className="input" name="max_salary" inputMode="numeric" defaultValue={t.max_salary ?? ""} required />
                      )}
                    </td>
                    <td>
                      <input
                        className="input"
                        name="fee"
                        inputMode="numeric"
                        defaultValue={t.fee_cents != null ? t.fee_cents / 100 : ""}
                        placeholder="Set by hand"
                      />
                    </td>
                    <td>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => {
                            if (confirm("Remove this tier?")) removeTier(t.id);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Leave a fee empty to set it by hand for candidates in that range. Keep tiers in order from lowest salary to
          highest.
        </p>
        <button className="btn" type="submit" disabled={pending} style={{ marginTop: 16 }}>
          {pending ? "Saving…" : "Save fees"}
        </button>
      </form>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="notice notice-good" role="status" style={{ marginTop: 14 }}>
          {state.ok}
        </p>
      )}
    </>
  );
}
