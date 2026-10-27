import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { agreementText } from "@/lib/agreement";
import { getListed, getTiers } from "@/lib/catalog";
import { db } from "@/lib/db";
import { brandName, feeFor, money, refCode } from "@/lib/format";
import { requireOwner } from "@/lib/session";
import { SignForm } from "./SignForm";

export const dynamic = "force-dynamic";

export default async function UnlockPage({ params, searchParams }: PageProps<"/candidates/[id]/unlock">) {
  const { id } = await params;
  const sp = await searchParams;
  const owner = await requireOwner(`/candidates/${id}/unlock`);

  const { data: existing } = await db()
    .from("unlocks")
    .select("id")
    .eq("owner_id", owner.id)
    .eq("candidate_id", id)
    .not("confirmed_at", "is", null)
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
          Sign this agreement and {owner.card_pm ? "keep your card on file" : "add a card"} to see the name,
          contact details and full profile for candidate {refCode(id)}. <strong>Nothing is charged now.</strong> If
          you hire them within 12 months, the fee is{" "}
          <strong>{fee != null ? money(fee) : "the amount we agree with you"}</strong>, charged to that card.
        </p>
      </div>
      {sp.card === "cancelled" && (
        <p className="notice notice-gold" role="status" style={{ marginBottom: 16 }}>
          A card on file is needed to see who this is. Nothing was charged. Sign again below to add one.
        </p>
      )}
      <pre
        className="panel"
        style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 15, maxHeight: 420, overflow: "auto" }}
        tabIndex={0}
        aria-label="Agreement text"
      >
        {text}
      </pre>
      <SignForm candidateId={id} defaultName={owner.full_name ?? ""} savedCard={owner.card_pm ? owner.card_label ?? "card on file" : null} />
    </div>
  );
}
