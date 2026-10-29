import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgreementDoc } from "@/components/AgreementDoc";
import { MobileBar } from "@/components/MobileBar";
import { WorksBest } from "@/components/CandidateCard";
import { agreementText } from "@/lib/agreement";
import { getListed, getTiers } from "@/lib/catalog";
import { db } from "@/lib/db";
import { brandName, contactPhone, contactPhoneHref, feeFor, LEVEL_LABEL, money, refCode, salaryRange } from "@/lib/format";
import { requireOwner } from "@/lib/session";
import { SignForm } from "./SignForm";
import styles from "./unlock.module.css";

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
  const feeText = fee != null ? money(fee) : "a flat fee we agree with you up front";
  const text = agreementText({
    brand: brandName(),
    ownerName: owner.full_name ?? "",
    company: owner.company ?? "",
    candidateRef: refCode(id),
    feeCents: fee,
  });
  const savedCard = owner.card_pm ? (owner.card_label ?? "card on file") : null;
  const first = (owner.full_name ?? "").split(" ")[0];

  return (
    <div className={`wrap ${styles.page}`}>
      <Link href={`/candidates/${id}`} className="small muted">
        Back to the profile
      </Link>

      <div className={styles.layout}>
        <div>
          <p className={styles.kicker}>Free to see · You only pay if you hire</p>
          <h1 className={styles.title}>{first ? `${first}, meet` : "Meet"} your next hire</h1>
          <p className={styles.lede}>
            Confirm a few simple terms and you&rsquo;ll see their name, resume and contact details right away. Reach out
            directly, interview, take your time.
          </p>

          {sp.card === "cancelled" && (
            <p className="notice notice-gold" role="status" style={{ marginTop: 18 }}>
              No problem, nothing was charged. Whenever you&rsquo;re ready, finish below to see who this is.
            </p>
          )}

          <ol className={styles.steps}>
            <li>
              <strong>Agree to the terms</strong>
              <span>Takes 30 seconds.</span>
            </li>
            <li>
              <strong>{savedCard ? "Use your card on file" : "Add a card"}</strong>
              <span>Nothing is charged today.</span>
            </li>
            <li>
              <strong>Meet them</strong>
              <span>Name, resume and contact details, instantly.</span>
            </li>
          </ol>

          <section className={styles.deal}>
            <h2>The deal, in plain English</h2>
            <ul>
              <li>
                <b>Looking is free.</b> See who they are, talk to them, interview them. No cost.
              </li>
              <li>
                <b>Hire them, and it&rsquo;s {feeText}, once.</b> No percentage of salary, no subscription, no surprises.
              </li>
              <li>
                <b>You pay when you decide to hire,</b> with one click. Not before.
              </li>
              <li>
                <b>Keep it between us.</b> Their details are for your hiring only. If you share them and someone else
                hires them within 12 months, the fee still applies.
              </li>
            </ul>
          </section>

          <details className={styles.faq}>
            <summary>Why do you need a card?</summary>
            <p>
              It keeps the catalog serious and fair to candidates, who trust us with their details. Your card is stored
              securely by Stripe, and nothing is charged unless you decide to hire.
            </p>
          </details>
          <details className={styles.faq}>
            <summary>What if I already knew this person?</summary>
            <p>
              Tell us within two days of signing and send us something that shows it, like an application they sent
              you or emails about a job. Then no fee applies.
            </p>
          </details>

          <details className={styles.full}>
            <summary>Read the full agreement</summary>
            <AgreementDoc text={text} />
          </details>

          <div id="sign" style={{ scrollMarginTop: 16 }} />
          <SignForm candidateId={id} defaultName={owner.full_name ?? ""} savedCard={savedCard} fee={fee != null ? money(fee) : null} />
        </div>

        <aside className={styles.side}>
          <div className={styles.who}>
            <p className={styles.ref}>Candidate {refCode(id)}</p>
            <h2>{c.headline ?? c.role_category ?? "Candidate"}</h2>
            <WorksBest c={c} compact />
            <ul className={styles.facts}>
              {c.role_category && <li>{c.role_category}</li>}
              {c.level && <li>{LEVEL_LABEL[c.level]}</li>}
              {c.location_region && <li>{c.location_region}</li>}
              {(c.salary_min || c.salary_max) && <li>{salaryRange(c.salary_min, c.salary_max)}</li>}
            </ul>
            <p className={styles.coached}>Coached and assessed by our team before listing.</p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Questions first? Text or call <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>. Happy to help.
          </p>
        </aside>
      </div>
      <MobileBar label="$0 today" sub={fee != null ? `${money(fee)} only if you hire` : "Pay only if you hire"}>
          <a className="btn btn-gold" href="#sign">
            Agree and meet them
          </a>
        </MobileBar>
    </div>
  );
}
