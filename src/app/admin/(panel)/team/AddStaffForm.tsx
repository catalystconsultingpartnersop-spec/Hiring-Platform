"use client";

import { useActionState } from "react";
import { addStaff, FormState } from "../../actions";

export function AddStaffForm({ canAddAdmin }: { canAddAdmin: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addStaff, {});
  return (
    <form action={action} className="panel panel-wash" key={state.ok ?? "form"}>
      <h2 style={{ fontSize: 19, marginBottom: 14 }}>Add someone to the team</h2>
      <div className="grid-2">
        <label className="field">
          <span>Name</span>
          <input className="input" name="full_name" required />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" name="email" required />
        </label>
      </div>
      <label className="field" style={{ marginTop: 14 }}>
        <span>Role</span>
        <select className="select" name="role" defaultValue="rep" style={{ maxWidth: 320 }}>
          <option value="rep">Rep: adds and updates candidates</option>
          {canAddAdmin && <option value="admin">Admin: everything, including money</option>}
        </select>
      </label>
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
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 16 }}>
        {pending ? "Adding…" : "Add and email them a sign-in link"}
      </button>
    </form>
  );
}
