import { verifyCandidateLink } from "../actions";

// One button press (not page load) so email scanners don't use up the link.
export default async function CandidateVerifyPage({ searchParams }: PageProps<"/me/verify">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="wrap narrow" style={{ maxWidth: 460 }}>
      <div className="page-head">
        <h1>Welcome back</h1>
        <p>Press the button to open your page.</p>
      </div>
      <form action={verifyCandidateLink}>
        <input type="hidden" name="token" value={token} />
        <button className="btn btn-gold" type="submit">
          Open my page
        </button>
      </form>
    </div>
  );
}
