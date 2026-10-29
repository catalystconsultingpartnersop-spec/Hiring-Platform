import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgreementDoc } from "@/components/AgreementDoc";
import { PrintButton } from "@/components/PrintButton";
import { Letterhead } from "@/components/Logo";
import { db, Owner, Unlock } from "@/lib/db";
import { refCode } from "@/lib/format";

import { currentOwner, isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

// A signed agreement, for the owner who signed it (or the admin).
export default async function SignedAgreement({ params }: PageProps<"/account/agreements/[id]">) {
  const { id } = await params;
  const [owner, admin] = await Promise.all([currentOwner(), isAdmin()]);
  if (!owner && !admin) redirect(`/login?next=${encodeURIComponent(`/account/agreements/${id}`)}`);

  const { data } = await db().from("unlocks").select("*, owners(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const unlock = data as Unlock;
  const signer = (data as unknown as { owners: Owner }).owners;
  if (!admin && signer.id !== owner?.id) notFound();

  return (
    <div className="wrap narrow" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <Link href={admin && !owner ? "/admin" : "/account"} className="small muted">
          {admin && !owner ? "Back to the dashboard" : "Your candidates"}
        </Link>
        <PrintButton />
      </div>
      <Letterhead right={<>Signed agreement<br />Candidate {refCode(unlock.candidate_id)}</>} />
      <AgreementDoc
        text={unlock.agreement_text}
        signature={{
          name: unlock.signed_name,
          company: signer.company ?? "",
          email: signer.email,
          signedAt: unlock.signed_at,
          ip: unlock.ip,
          version: unlock.agreement_version,
        }}
      />
      <p className="small muted" style={{ marginTop: 14 }}>
        Candidate {refCode(unlock.candidate_id)}.{" "}
        {unlock.confirmed_at ? `${unlock.card_label ?? "Card"} on file.` : "No card was added, so this agreement isn't active."}
      </p>
    </div>
  );
}
