"use client";

import { useActionState } from "react";
import { addExpense, FormState } from "../../actions";

const CATEGORIES = ["Software", "Marketing", "Legal and accounting", "Payment fees", "Office", "Other"];

export function ExpenseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addExpense, {});
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
      <label className="field" style={{ margin: 0 }}>
        <span>Date</span>
        <input className="input" type="date" name="spent_on" defaultValue={today} style={{ width: 160 }} />
      </label>
      <label className="field" style={{ margin: 0, flex: "1 1 200px" }}>
        <span>What</span>
        <input className="input" name="what" placeholder="e.g. Google Workspace" required />
      </label>
      <label className="field" style={{ margin: 0 }}>
        <span>Category</span>
        <select className="select" name="category" defaultValue="Software">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field" style={{ margin: 0 }}>
        <span>Amount ($)</span>
        <input className="input" name="amount" inputMode="decimal" placeholder="49.99" required style={{ width: 110 }} />
      </label>
      <button className="btn btn-small" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add expense"}
      </button>
      {state.error && <span className="small" style={{ color: "var(--rust)" }}>{state.error}</span>}
      {state.ok && !pending && <span className="small" style={{ color: "var(--moss)" }}>{state.ok}</span>}
    </form>
  );
}
