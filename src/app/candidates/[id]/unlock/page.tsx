import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgreementDoc } from "@/components/AgreementDoc";
import { MobileBar } from "@/components/MobileBar";
import { WorksBest } from "@/components/CandidateCard";
import { agreementText } from "@/lib/agreement";
import { getListed, getTiers } from "@/lib/catalog";
import { db } from "@/lib/db";
import { brandName, feeFor, LEVEL_LABEL, money, refCode, salaryRange } from "@/lib/format";
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
  const text = agreementText({
    brand: brandName(),
    ownerName: owner.full_name ?? "",
    company: owner.company ?? "",
    candidateRef: refCode(id),
    feeCents: fee,
  });
  const savedCard = owner.card_pm ? (owner.card_label ?? "card on file") : null;
  const first = (owner.full_name ?? "").split(" ")[0];

  const candidateFee = fee != null ? money(fee) : "one flat fee";
  return (
    <div className={`wrap ${styles.page}`}>
      <Link href={`/candidates/${id}`} className="small muted">
        Back to the profile
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{first ? `${first}, here’s` : "Here’s"} how to meet them</h1>
        <p className={styles.lede}>
          Sign a short agreement and add a card. <strong>Nothing is charged today.</strong> You&rsquo;ll see their name,
          resume and phone number right away, and we&rsquo;ll help you set up a first call.
        </p>
        <ol className={styles.flow} aria-label="Steps">
          <li>Sign</li>
          <li>{savedCard ? "Use your card on file" : "Add a card"}</li>
          <li>Meet them</li>
        </ol>
      </header>

      <div className={styles.layout}>
        <div>
          {sp.card === "cancelled" && (
            <p className="notice notice-gold" role="status" style={{ marginTop: 18 }}>
              No problem, nothing was charged. Whenever you&rsquo;re ready, sign below to see who this is.
            </p>
          )}

          <section className={styles.deal} aria-label="The agreement in plain English">
            <h2>The agreement, in plain English</h2>
            <ul>
              <li>
                <b>Meeting them is free.</b> Talk, interview, take your time.
              </li>
              <li>
                <b>{candidateFee}, only if you hire.</b> Once, never a percentage of salary. We charge it when you tell us
                you&rsquo;re hiring.
              </li>
              <li>
                <b>Not a fit? You owe nothing.</b> Just let us know, with one tap.
              </li>
              <li>
                <b>Keep their details to yourself.</b> They&rsquo;re for your own hiring. If they&rsquo;re passed on and
                someone else hires this person within 12 months, the fee still applies.
              </li>
            </ul>
          </section>

          <details className={styles.faq}>
            <summary>Why do you need a card if nothing is charged?</summary>
            <p>
              Candidates trust us with their name and contact details, so we only share them with employers who are
              serious. Your card is held securely by Stripe, and it&rsquo;s only charged if you hire.
            </p>
          </details>
          <details className={styles.faq}>
            <summary>What if I already know this person?</summary>
            <p>
              Tell us within two business days of signing and send something dated before today that shows it, like an
              application they sent you. Then there&rsquo;s no fee.
            </p>
          </details>
          <details className={styles.full}>
            <summary>Read the full agreement</summary>
            <AgreementDoc text={text} />
          </details>

          <div id="sign" style={{ scrollMarginTop: 16 }} />
          <SignForm
            candidateId={id}
            defaultName={owner.full_name ?? ""}
            company={owner.company ?? ""}
            savedCard={savedCard}
            fee={fee != null ? money(fee) : null}
          />
        </div>

        <aside className={styles.side}>
          <div className={styles.who}>
            <p className={styles.ref}>You&rsquo;re about to meet</p>
            <h2>{c.headline ?? c.role_category ?? "Candidate"}</h2>
            <WorksBest c={c} compact />
            <ul className={styles.facts}>
              {c.role_category && <li>{c.role_category}</li>}
              {c.level && <li>{LEVEL_LABEL[c.level]}</li>}
              {c.location_region && <li>{c.location_region}</li>}
              {(c.salary_min || c.salary_max) && <li>{salaryRange(c.salary_min, c.salary_max)}</li>}
            </ul>
            <p className={styles.coached}>We sat down with them and learned how they work best.</p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Questions first? <Link href={`/contact?c=${id}`}>Contact us</Link>.
          </p>
        </aside>
      </div>
      <MobileBar label="$0 today" sub={fee != null ? `${money(fee)} only if you hire` : "Pay only if you hire"}>
        <a className="btn btn-gold" href="#sign">
          Sign and meet them
        </a>
      </MobileBar>
    </div>
  );
}
