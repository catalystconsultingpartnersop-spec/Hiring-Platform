import { verifyLink } from "@/app/login/actions";

// The link in the email lands here, and the person presses one button to sign in.
// Signing in on a button press (not on page load) stops email security scanners,
// which open links automatically, from using up the one-time link.
export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="wrap narrow" style={{ maxWidth: 480 }}>
      <div className="page-head">
        <h1>Sign in</h1>
        <p>Press the button to finish signing in.</p>
      </div>
      <form action={verifyLink}>
        <input type="hidden" name="token" value={token} />
        <button className="btn btn-gold" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
