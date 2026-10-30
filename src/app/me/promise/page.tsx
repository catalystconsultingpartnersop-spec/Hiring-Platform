import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dateShort } from "@/lib/format";
import { OUR_SIDE, YOUR_SIDE } from "@/lib/promise";
import { currentCandidateId } from "@/lib/session";
import { signPromise } from "../actions";
import styles from "../me.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your candidate promise" };

export default async function PromisePage({ searchParams }: PageProps<"/me/promise">) {
  const sp = await searchParams;
  const id = await currentCandidateId();
  if (!id) redirect("/me/login");
  const { data: c } = await db().from("candidates").select("*").eq("id", id).maybeSingle();
  if (!c) redirect("/me/login");
  const signed = c.promise_signed_at as string | null;

  return (
    <div className="wrap narrow" style={{ paddingBlock: "40px 64px" }}>
      <p className={styles.sideLabel}>Your candidate promise</p>
      <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", margin: "6px 0 10px" }}>One quick promise between us.</h1>
      <p className="muted" style={{ fontSize: 18, margin: "0 0 26px" }}>
        {signed ? "You've already signed this. Thank you." : "Before your profile goes live, here's what we promise you, and what we ask of you."}
      </p>

      <div className="panel" style={{ display: "grid", gap: 22 }}>
        <section>
          <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Our side</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 17 }}>
            {OUR_SIDE.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Your side</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 17 }}>
            {YOUR_SIDE.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        {signed ? (
          <p className="notice notice-good" style={{ margin: 0 }}>
            Signed by {c.promise_name} on {dateShort(signed)}. <Link href="/me">Back to your page</Link>
          </p>
        ) : (
          <form action={signPromise} style={{ display: "grid", gap: 14, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            {sp.error === "1" && (
              <p className="notice notice-bad" style={{ margin: 0 }}>
                Type your full name and tick the box to sign.
              </p>
            )}
            <label className="field">
              <span>Your full name</span>
              <input className="input" name="name" defaultValue={c.full_name} autoComplete="name" required />
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16 }}>
              <input type="checkbox" name="agree" required style={{ marginTop: 4 }} />
              <span>I agree to my candidate promise.</span>
            </label>
            <button className="btn btn-gold" type="submit" style={{ justifySelf: "start" }}>
              Sign
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
