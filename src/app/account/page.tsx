import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { db, Hire } from "@/lib/db";
import { dateShort, money, refCode } from "@/lib/format";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  candidate_id: string;
  signed_at: string;
  fee_cents: number | null;
  candidates: { full_name: string; headline: string | null; status: string };
  hires: Hire[];
};

export default async function AccountPage() {
  const owner = await requireOwner("/account");
  const { data } = await db()
    .from("unlocks")
    .select("id, candidate_id, signed_at, fee_cents, candidates(full_name, headline, status), hires(*)")
    .eq("owner_id", owner.id)
    .order("signed_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Your candidates</h1>
        <p>
          {owner.full_name}, {owner.company}. Everyone you&rsquo;ve signed for is here.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="panel panel-wash">
          <p>You haven&rsquo;t unlocked anyone yet.</p>
          <Link className="btn btn-gold" href="/candidates" style={{ marginTop: 16 }}>
            Browse candidates
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Signed</th>
                <th>Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hire = [...r.hires].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/candidates/${r.candidate_id}`}>{r.candidates.full_name}</Link>
                      <div className="small muted">
                        {refCode(r.candidate_id)}: {r.candidates.headline}
                      </div>
                    </td>
                    <td>{dateShort(r.signed_at)}</td>
                    <td>{money(r.fee_cents)}</td>
                    <td>
                      {hire?.status === "paid" ? (
                        <span className="tag tag-good">Paid</span>
                      ) : hire?.status === "hired" ? (
                        <span className="tag tag-good">Hired</span>
                      ) : hire?.status === "refunded" ? (
                        <span className="tag">Refunded</span>
                      ) : (
                        <span className="tag">Considering</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Link className="btn btn-ghost btn-small" href="/account/setup?next=/account">
          Edit your details
        </Link>
        <form action={signOut}>
          <button className="btn btn-ghost btn-small" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
