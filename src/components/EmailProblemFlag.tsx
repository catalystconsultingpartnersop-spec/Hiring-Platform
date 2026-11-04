import { clearEmailProblemAction } from "@/app/admin/actions";
import type { EmailProblem } from "@/lib/emailProblems";
import { dateShort } from "@/lib/format";

// A red flag when emails to this person aren't arriving.
export function EmailProblemFlag({ email, p }: { email: string; p: EmailProblem | null }) {
  if (!p) return null;
  return (
    <div className="notice notice-bad small" style={{ margin: "6px 0 0", padding: "8px 10px" }}>
      <strong>Emails to {email} aren&rsquo;t arriving</strong> (since {dateShort(p.at)}).{" "}
      Check the address. If the inbox was the problem, remove it from Resend&rsquo;s blocked list (Resend → Emails → Suppressions).
      <form action={clearEmailProblemAction.bind(null, email)} style={{ display: "inline", marginLeft: 6 }}>
        <button className="btn btn-small btn-ghost" type="submit">
          Fixed it
        </button>
      </form>
    </div>
  );
}
