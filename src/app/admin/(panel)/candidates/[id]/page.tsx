import { requireStaff } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTiers } from "@/lib/catalog";
import { Candidate, db } from "@/lib/db";
import { dateShort, feeFor, money, refCode } from "@/lib/format";
import { deleteCandidate } from "../../../actions";
import { CandidateForm } from "../CandidateForm";
import { COMPANY_TZ, formatInZone } from "@/lib/time";

export default async function EditCandidate({ params, searchParams }: PageProps<"/admin/candidates/[id]">) {
  const me = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as Candidate;
  const tierFee = feeFor({ ...c, fee_override_cents: null }, await getTiers());

  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("id, starts_at, status, staff(full_name, email, time_zone)")
    .eq("candidate_id", id)
    .order("starts_at", { ascending: false });
  const callRows = (calls ?? []) as unknown as {
    id: string;
    starts_at: string;
    status: string;
    staff: { full_name: string | null; email: string; time_zone: string | null };
  }[];

  const { data: unlocks } = await db()
    .from("unlocks")
    .select("id, signed_at, owners(company, email)")
    .eq("candidate_id", id)
    .order("signed_at", { ascending: false });

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <p className="small muted">
          {refCode(c.id)}, applied {dateShort(c.created_at)}
          {c.status === "listed" && (
            <>
              {" "}
              · <Link href={`/candidates/${c.id}`}>View public profile</Link>
            </>
          )}
        </p>
        <h1>{c.full_name}</h1>
        {typeof sp.saved === "string" && (
          <p className={`notice ${sp.saved === "listed" ? "notice-good" : "notice-gold"}`} style={{ marginTop: 14 }}>
            {sp.saved === "listed"
              ? "Saved. They're live in the catalog."
              : "Saved as a draft. Owners won't see them until you set the status to Listed."}
          </p>
        )}
        {typeof sp.resume === "string" && (
          <p className="notice notice-bad" role="alert" style={{ marginTop: 10 }}>
            Everything else was saved, but {sp.resume}. Attach it again in section 1 and save.
          </p>
        )}
        {callRows.length > 0 && (
          <p style={{ marginTop: 10 }}>
            Onboarding call:{" "}
            {callRows
              .map(
                (k) =>
                  `${formatInZone(k.starts_at, k.staff.time_zone ?? COMPANY_TZ, { weekday: "short", month: "short" })} with ${k.staff.full_name || k.staff.email} (${k.status.replace("_", "-")})`,
              )
              .join("; ")}
          </p>
        )}
        {(unlocks ?? []).length > 0 && (
          <p style={{ marginTop: 10 }}>
            Signed for by:{" "}
            {(unlocks as unknown as { id: string; signed_at: string; owners: { company: string } }[])
              .map((u) => `${u.owners.company} (${dateShort(u.signed_at)})`)
              .join(", ")}
          </p>
        )}
      </div>
      <CandidateForm c={c} tierFeeLabel={tierFee != null ? money(tierFee) : "set by hand"} isAdmin={me.role === "admin"} />
      {me.role === "admin" && (
        <details className="panel" style={{ marginTop: 32, borderColor: "var(--rust-soft)" }} open={typeof sp.delete_error === "string"}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--rust)" }}>Delete this candidate</summary>
          {(unlocks ?? []).length > 0 ? (
            <p className="small" style={{ marginTop: 10 }}>
              A client has signed for this candidate, so their record has to stay for your agreements and payments. To
              take them off the site, set the status to <strong>Archived</strong> above.
            </p>
          ) : (
            <form action={deleteCandidate.bind(null, c.id)} style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 420 }}>
              <p className="small" style={{ margin: 0 }}>
                Permanently removes {c.full_name}, their resume and any booked calls. Use this for test entries or
                mistakes. It can&rsquo;t be undone.
              </p>
              <label className="field">
                <span>Type DELETE to confirm</span>
                <input className="input" name="confirm" autoComplete="off" />
              </label>
              {typeof sp.delete_error === "string" && (
                <p className="notice notice-bad" role="alert" style={{ margin: 0 }}>
                  {sp.delete_error}
                </p>
              )}
              <button className="btn btn-danger" type="submit" style={{ justifySelf: "start" }}>
                Delete permanently
              </button>
            </form>
          )}
        </details>
      )}
    </>
  );
}
