import Link from "next/link";
import { db } from "@/lib/db";
import { dateShort, refCode } from "@/lib/format";

import { requireStaff } from "@/lib/session";
import { markRequestHandled } from "../../actions";

export const dynamic = "force-dynamic";

type Req = {
  id: string;
  created_at: string;
  kind: "hiring" | "work" | "other";
  name: string;
  email: string;
  phone: string | null;
  best_time: string | null;
  message: string | null;
  candidate_id: string | null;
  routed_to: string[];
  status: "new" | "handled";
  handled_by: string | null;
  handled_at: string | null;
  candidates: { full_name: string } | null;
};

const KIND = { hiring: "Client", work: "Candidate", other: "Other" } as const;

// "Contact us" requests. Heshy sees all of them; reps see the ones sent to them.
export default async function Requests({ searchParams }: PageProps<"/admin/requests">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const showAll = sp.show === "all";
  let q = db().from("contact_requests").select("*, candidates(full_name)").order("created_at", { ascending: false }).limit(200);
  if (me.role !== "admin" && me.id) q = q.contains("routed_to", [me.id]);
  if (!showAll) q = q.eq("status", "new");
  const { data } = await q;
  const rows = (data ?? []) as Req[];
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 6 }}>
        <h1>Requests</h1>
        <p>People who used &ldquo;Contact us&rdquo;. Follow up when it makes sense, then mark it done.</p>
      </div>
      <p className="small" style={{ margin: "0 0 14px" }}>
        {showAll ? <Link href="/admin/requests">Show only open requests</Link> : <Link href="/admin/requests?show=all">Show done ones too</Link>}
      </p>
      {rows.length === 0 ? (
        <p className="panel panel-wash">Nothing waiting. Nice.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => (
            <div key={r.id} className="panel" style={{ opacity: r.status === "handled" ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{r.name}</strong> <span className="tag">{KIND[r.kind]}</span>{" "}
                  {r.phone && <span className="tag tag-gold">Wants a call back</span>}
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {dateShort(r.created_at)} · <a href={`mailto:${r.email}`}>{r.email}</a>
                    {r.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${r.phone}`}>{r.phone}</a>
                        {r.best_time ? ` (best: ${r.best_time})` : ""}
                      </>
                    )}
                    {r.candidate_id && (
                      <>
                        {" · About "}
                        <Link href={`/admin/candidates/${r.candidate_id}`}>{r.candidates?.full_name ?? refCode(r.candidate_id)}</Link>
                      </>
                    )}
                  </div>
                </div>
                {r.status === "new" ? (
                  <form action={markRequestHandled.bind(null, r.id)}>
                    <button className="btn btn-small btn-ghost" type="submit">
                      Mark done
                    </button>
                  </form>
                ) : (
                  <span className="small muted">
                    Done {dateShort(r.handled_at)}
                    {r.handled_by ? ` by ${r.handled_by}` : ""}
                  </span>
                )}
              </div>
              {r.message && <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{r.message}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
