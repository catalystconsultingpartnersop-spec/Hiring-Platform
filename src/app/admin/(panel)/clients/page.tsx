import Link from "next/link";
import { latest, loadAgreements } from "@/lib/adminData";
import { db, Owner } from "@/lib/db";
import { dateShort, money } from "@/lib/format";

import { requireAdmin } from "@/lib/session";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

type OwnerRow = Owner & { created_at: string; last_login_at: string | null };

// Clients: every business owner with an account.
export default async function ClientsPage({ searchParams }: PageProps<"/admin/clients">) {
  const sp = await searchParams;
  await requireAdmin();
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const [{ data, error }, { rows: agreements }] = await Promise.all([
    db().from("owners").select("*").order("created_at", { ascending: false }),
    loadAgreements(),
  ]);
  const owners = ((data ?? []) as OwnerRow[]).filter((o) =>
    q ? [o.company, o.full_name, o.email, o.phone].join(" ").toLowerCase().includes(q) : true,
  );

  const byOwner = new Map<string, { signed: number; hires: number; paid: number; considering: number }>();
  for (const a of agreements) {
    const key = a.owners.email;
    const v = byOwner.get(key) ?? { signed: 0, hires: 0, paid: 0, considering: 0 };
    if (a.confirmed_at) v.signed++;
    const h = latest(a.hires);
    if (h && (h.status === "paid" || h.status === "hired")) {
      v.hires++;
      v.paid += h.amount_cents;
    } else if (a.confirmed_at && !h) v.considering++;
    byOwner.set(key, v);
  }

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Clients</h1>
          <p>Every business owner with an account. Click one to see their agreements, payments and refunds.</p>
        </div>
        <form style={{ display: "flex", gap: 8 }}>
          <input className="input" name="q" defaultValue={q} placeholder="Search company, name, email…" style={{ minWidth: 240 }} />
          <button className="btn btn-small" type="submit">
            Search
          </button>
        </form>
      </div>
      {error && (
        <p className="notice notice-bad" role="alert">
          Couldn&rsquo;t load clients: {error.message}
        </p>
      )}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{(data ?? []).length}</strong>
          <span>Clients</span>
        </div>
        <div className={styles.stat}>
          <strong>{[...byOwner.values()].filter((v) => v.signed > 0).length}</strong>
          <span>Have signed an agreement</span>
        </div>
        <div className={styles.stat}>
          <strong>{[...byOwner.values()].filter((v) => v.hires > 0).length}</strong>
          <span>Have hired</span>
        </div>
      </div>
      {owners.length === 0 ? (
        <p className="panel panel-wash">{q ? "No clients match that search." : "No clients yet."}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Signed</th>
                <th>Hired</th>
                <th>Paid</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => {
                const v = byOwner.get(o.email) ?? { signed: 0, hires: 0, paid: 0, considering: 0 };
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/clients/${o.id}`}>
                        <strong>{o.company || "(no company yet)"}</strong>
                      </Link>
                      <div className="small muted">{o.card_label ? `${o.card_label} on file` : "No card on file"}</div>
                    </td>
                    <td>
                      {o.full_name}
                      <div className="small muted">
                        <a href={`mailto:${o.email}`}>{o.email}</a>
                        {o.phone ? `, ${o.phone}` : ""}
                      </div>
                    </td>
                    <td>
                      {v.signed}
                      {v.considering > 0 && <div className="small muted">{v.considering} considering</div>}
                    </td>
                    <td>{v.hires}</td>
                    <td>{v.paid ? money(v.paid) : "—"}</td>
                    <td>
                      {dateShort(o.created_at)}
                      <div className="small muted">Last seen {dateShort(o.last_login_at)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
