import { requireStaff } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTiers } from "@/lib/catalog";
import { Candidate, db } from "@/lib/db";
import { dateShort, feeFor, money, refCode } from "@/lib/format";
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
    </>
  );
}
