import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { agreementText } from "@/lib/agreement";
import { getListed, getTiers } from "@/lib/catalog";
import { db } from "@/lib/db";
import { brandName, feeFor, money, refCode } from "@/lib/format";
import { requireOwner } from "@/lib/session";
import { isSampleId } from "@/lib/samples";
import { SignForm } from "./SignForm";

export const dynamic = "force-dynamic";

export default async function UnlockPage({ params }: PageProps<"/candidates/[id]/unlock">) {
  const { id } = await params;
  if (isSampleId(id)) {
    return (
      <div className="wrap narrow" style={{ paddingTop: 28 }}>
        <div className="page-head">
          <h1>This is a sample profile</h1>
          <p>
            With a real candidate, this is where you&rsquo;d sign a short agreement and then see their name, resume and
            contact details. Nothing to pay until you decide to hire.
          </p>
        </div>
        <Link className="btn" href="/candidates">
          Keep browsing
        </Link>
      </div>
    );
  }
  const owner = await requireOwner(`/candidates/${id}/unlock`);

  const { data: existing } = await db()
    .from("unlocks")
    .select("id")
    .eq("owner_id", owner.id)
    .eq("candidate_id", id)
    .maybeSingle();
  if (existing) redirect(`/candidates/${id}`);

  const c = await getListed(id);
  if (!c) notFound();
  const fee = feeFor(c, await getTiers());
  const text = agreementText({
    brand: brandName(),
    ownerName: owner.full_name ?? "",
    company: owner.company ?? "",
    candidateRef: refCode(id),
    feeCents: fee,
  });

  return (
    <div className="wrap narrow" style={{ paddingTop: 28 }}>
      <Link href={`/candidates/${id}`} className="small muted">
        Back to the profile
      </Link>
      <div className="page-head" style={{ paddingTop: 16 }}>
        <h1>See who this is</h1>
        <p>
          Sign this agreement to see the name, contact details and full profile for candidate {refCode(id)}.
          There&rsquo;s nothing to pay now. If you hire them within 12 months, the fee is{" "}
          <strong>{fee != null ? money(fee) : "the amount we agree with you"}</strong>.
        </p>
      </div>
      <pre
        className="panel"
        style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 15, maxHeight: 420, overflow: "auto" }}
        tabIndex={0}
        aria-label="Agreement text"
      >
        {text}
      </pre>
      <SignForm candidateId={id} defaultName={owner.full_name ?? ""} />
    </div>
  );
}
