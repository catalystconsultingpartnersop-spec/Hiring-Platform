import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { brandName, dateShort, money, refCode } from "@/lib/format";
import { Candidate, db, Unlock } from "@/lib/db";
import { latestHire } from "@/lib/hires";
import { requireOwner } from "@/lib/session";
import { startHire } from "../actions";
import { HireSubmit } from "./HireSubmit";
import styles from "./hire.module.css";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  confirm: "Tick the box to confirm before you continue.",
  declined: "Your card on file was declined, so nothing was charged. Try again, or pay with a different card below.",
  cancelled: "Payment cancelled. Nothing was charged.",
  failed: "Something went wrong and nothing was charged. Try again in a minute.",
};

export default async function HirePage({ params, searchParams }: PageProps<"/candidates/[id]/hire">) {
  const { id } = await params;
  const sp = await searchParams;
  const owner = await requireOwner(`/candidates/${id}/hire`);

  const { data } = await db()
    .from("unlocks")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("candidate_id", id)
    .not("confirmed_at", "is", null)
    .maybeSingle();
  const unlock = data as Unlock | null;
  if (!unlock) redirect(`/candidates/${id}`);
  const hire = await latestHire(unlock.id);
  if (hire && (hire.status === "paid" || hire.status === "hired")) redirect(`/candidates/${id}`);

  const { data: cd } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!cd) notFound();
  const c = cd as Candidate;
  const first = c.full_name.split(" ")[0];
  const fee = unlock.fee_cents;
  const card = unlock.card_pm ? (unlock.card_label ?? "card on file") : null;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : null;
  const action = startHire.bind(null, id);

  return (
    <div className="wrap" style={{ maxWidth: 760, paddingTop: 28, paddingBottom: 56 }}>
      <Link href={`/candidates/${id}`} className="small muted">
        Back to {first}&rsquo;s profile
      </Link>
      <div className="page-head" style={{ paddingTop: 14, paddingBottom: 18 }}>
        <h1>Hire {first}</h1>
        <p>Here&rsquo;s exactly what happens when you confirm.</p>
      </div>

      {error && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: 18 }}>
          {error}
        </p>
      )}

      <div className={styles.summary}>
        <div>
          <span>Candidate</span>
          <strong>{c.full_name}</strong>
          <em>{refCode(id)}</em>
        </div>
        <div>
          <span>Flat fee</span>
          <strong>{fee != null ? money(fee) : "Set with us"}</strong>
          <em>No percentage of salary</em>
        </div>
        <div>
          <span>Charged to</span>
          <strong>{fee == null ? "Nothing yet" : (card ?? "Card you enter next")}</strong>
          <em>Agreement signed {dateShort(unlock.signed_at)}</em>
        </div>
      </div>

      <ol className={styles.steps}>
        {fee == null ? (
          <>
            <li>
              <strong>We get in touch about the fee.</strong> This candidate&rsquo;s fee is set individually, so nothing is
              charged here. We&rsquo;ll contact you within one business day with the amount.
            </li>
            <li>
              <strong>Once it&rsquo;s paid, you make the hire.</strong>
            </li>
          </>
        ) : (
          <>
            <li>
              <strong>
                {card ? `We charge ${money(fee)} to your ${card}` : `You pay ${money(fee)} on our secure payment page`}
              </strong>{" "}
              right away. This is the only payment, ever, for this hire.
            </li>
            <li>
              <strong>You get a receipt by email</strong> straight away, and it&rsquo;s saved in your account.
            </li>
            <li>
              <strong>You make the offer and agree the details with {first} directly.</strong> Salary, start date and
              paperwork are between you and {first}. We step out of the way.
            </li>
          </>
        )}
      </ol>

      <form action={action} className={`panel ${styles.form}`}>
        <h2>A couple of details (optional)</h2>
        <div className="grid-2">
          <label className="field">
            <span>Job title</span>
            <input className="input" name="job_title" placeholder={c.role_category ?? "e.g. Office manager"} maxLength={120} />
          </label>
          <label className="field">
            <span>Expected start date</span>
            <input className="input" type="date" name="start_date" />
          </label>
        </div>

        <label className={`check ${styles.confirm}`}>
          <input type="checkbox" name="confirm" required />
          <span>
            I confirm that {owner.company} has decided to hire {c.full_name}
            {fee != null ? (
              <>
                {" "}
                and I authorize {brandName()} to charge {money(fee)}
                {card ? ` to our ${card}` : ""}, as set out in our signed agreement.
              </>
            ) : (
              "."
            )}
          </span>
        </label>

        <div className={styles.actions}>
          <HireSubmit
            label={fee == null ? "Confirm. Tell us I'm hiring" : card ? `Confirm and pay ${money(fee)}` : `Continue to payment`}
          />
          <Link href={`/candidates/${id}`} className="btn btn-ghost">
            Not yet
          </Link>
        </div>
        {card && fee != null && (
          <p className="small muted" style={{ marginTop: 14 }}>
            Want to use a different card? Tick the box above, then{" "}
            <HireSubmit label="pay with a different card" ghost name="other_card" value="1" />
          </p>
        )}
        <p className="small muted" style={{ marginTop: 14 }}>
          The fee isn&rsquo;t refundable once paid, except if {first} never starts work: then ask us within 30 days.
          See section 6 of your <Link href={`/account/agreements/${unlock.id}`}>agreement</Link>.
        </p>
      </form>
    </div>
  );
}
