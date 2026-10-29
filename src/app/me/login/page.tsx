import Link from "next/link";
import { redirect } from "next/navigation";
import { contactPhone, contactPhoneHref } from "@/lib/format";
import { currentCandidateId } from "@/lib/session";
import { LinkForm } from "./LinkForm";

export default async function CandidateLoginPage({ searchParams }: PageProps<"/me/login">) {
  const sp = await searchParams;
  if (await currentCandidateId()) redirect("/me");
  return (
    <div className="wrap narrow" style={{ maxWidth: 460 }}>
      <div className="page-head">
        <h1>Your page</h1>
        <p>See where things stand, how your profile looks to employers, and how to reach your rep.</p>
      </div>
      {sp.error === "expired" && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: 20 }}>
          That link has expired or was already used. Ask for a new one below.
        </p>
      )}
      <LinkForm />
      <p className="small muted" style={{ marginTop: 26, textAlign: "center" }}>
        Not with us yet? <Link href="/join">Join the Collection</Link>. Questions? Text{" "}
        <a href={`sms:${contactPhoneHref()}`}>{contactPhone()}</a>.
      </p>
      <p className="small muted" style={{ textAlign: "center" }}>
        Hiring? <Link href="/login">Business sign-in</Link>
      </p>
    </div>
  );
}
