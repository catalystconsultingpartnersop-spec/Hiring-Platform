import { verifyStaffLink } from "../actions";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { WelcomeForm } from "./WelcomeForm";

// From the welcome email: someone new chooses a password here and is signed in
// in the same step. Anyone who already has a password just presses Sign in.
// (Signing in on a button press stops email scanners from using up the link.)
export default async function StaffVerify({ searchParams }: PageProps<"/admin/verify">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const { data: t } = token
    ? await db().from("login_tokens").select("email, used_at, expires_at").eq("token_hash", hashToken(token)).eq("kind", "staff").maybeSingle()
    : { data: null };
  const live = !!t && !t.used_at && Date.parse(t.expires_at) > nowMs();
  const { data: member } = live ? await db().from("staff").select("full_name, password_hash, active").eq("email", t!.email).maybeSingle() : { data: null };
  const isNew = live && member?.active && !member.password_hash;

  return (
    <div className="wrap narrow" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>{isNew ? `Welcome, ${(member?.full_name ?? "").split(" ")[0] || "aboard"}` : "Team sign-in"}</h1>
        <p>{isNew ? "One step and you're in." : "Press the button to finish signing in."}</p>
      </div>
      {isNew ? (
        <WelcomeForm token={token} email={t!.email} />
      ) : (
        <form action={verifyStaffLink}>
          <input type="hidden" name="token" value={token} />
          <button className="btn" type="submit">
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
