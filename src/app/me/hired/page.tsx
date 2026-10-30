import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentCandidateId } from "@/lib/session";
import { reportHired } from "../actions";
import styles from "../me.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You got hired" };

export default async function HiredPage({ searchParams }: PageProps<"/me/hired">) {
  const sp = await searchParams;
  const id = await currentCandidateId();
  if (!id) redirect("/me/login");
  const [{ data: c }, { data: unlocks }] = await Promise.all([
    db().from("candidates").select("full_name").eq("id", id).maybeSingle(),
    db().from("unlocks").select("id, owners(company)").eq("candidate_id", id).not("confirmed_at", "is", null),
  ]);
  if (!c) redirect("/me/login");
  const met = ((unlocks ?? []) as unknown as { id: string; owners: { company: string | null } }[]).filter((u) => u.owners?.company);

  return (
    <div className="wrap narrow" style={{ paddingBlock: "40px 64px" }}>
      <p className={styles.sideLabel}>Great news</p>
      <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", margin: "6px 0 10px" }}>Congratulations, {c.full_name.split(" ")[0]}!</h1>
      <p className="muted" style={{ fontSize: 18, margin: "0 0 26px" }}>
        Tell us where you&rsquo;re going, and we&rsquo;ll take your profile down and let your rep know.
      </p>
      <form action={reportHired} className="panel" style={{ display: "grid", gap: 16 }}>
        {sp.error === "1" && (
          <p className="notice notice-bad" style={{ margin: 0 }}>
            Tell us where you were hired.
          </p>
        )}
        {met.length > 0 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
            <legend style={{ fontWeight: 700, marginBottom: 8 }}>Was it an employer you met through us?</legend>
            {met.map((u) => (
              <label key={u.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="radio" name="unlock" value={u.id} /> {u.owners.company}
              </label>
            ))}
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="radio" name="unlock" value="" defaultChecked /> No, somewhere else
            </label>
          </fieldset>
        )}
        <label className="field">
          <span>Where were you hired?</span>
          <input className="input" name="employer" placeholder="Company name" required />
        </label>
        <label className="field">
          <span>
            When do you start? <span className="opt">(optional)</span>
          </span>
          <input className="input" name="start" placeholder="e.g. November 10" />
        </label>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-gold" type="submit">
            Let us know
          </button>
          <Link href="/me" className="small">
            Not yet, take me back
          </Link>
        </div>
      </form>
    </div>
  );
}
