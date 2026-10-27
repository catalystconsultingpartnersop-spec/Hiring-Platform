import { verifyStaffLink } from "../actions";

// Signing in on a button press stops email scanners from using up the link.
export default async function StaffVerify({ searchParams }: PageProps<"/admin/verify">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="wrap narrow" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>Team sign-in</h1>
        <p>Press the button to finish signing in.</p>
      </div>
      <form action={verifyStaffLink}>
        <input type="hidden" name="token" value={token} />
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
