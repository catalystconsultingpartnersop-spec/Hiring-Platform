import { requireStaff } from "@/lib/session";
import { PasswordForm } from "./PasswordForm";

export default async function PasswordPage({ searchParams }: PageProps<"/admin/password">) {
  const me = await requireStaff();
  const sp = await searchParams;
  return (
    <div style={{ maxWidth: 460 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>{sp.welcome ? `Welcome, ${me.name.split(" ")[0]}` : "Your password"}</h1>
        <p>
          {sp.welcome
            ? "Set a password so you can sign in with your email and password from now on."
            : `Set a new password for ${me.email}.`}
        </p>
      </div>
      <PasswordForm />
    </div>
  );
}
