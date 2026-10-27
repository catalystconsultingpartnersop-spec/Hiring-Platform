import { redirect } from "next/navigation";
import { currentOwner } from "@/lib/session";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: PageProps<"/account/setup">) {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/candidates";
  return (
    <div className="wrap narrow" style={{ maxWidth: 520 }}>
      <div className="page-head">
        <h1>{owner.password_hash ? "Your details" : "About you"}</h1>
        <p>
          This goes on the agreements you sign, so use your real name and company.
          {sp.pw === "1" && " Choose a password so you can sign in straight away next time."}
        </p>
      </div>
      <SetupForm
        next={next}
        owner={{ full_name: owner.full_name, company: owner.company, phone: owner.phone, email: owner.email }}
        needsPassword={!owner.password_hash && sp.pw === "1"}
        resetting={!!owner.password_hash && sp.pw === "1"}
      />
    </div>
  );
}
