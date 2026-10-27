import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const error = sp.error === "expired" ? "That link has expired or was already used. Ask for a new one below." : "";
  return (
    <div className="wrap narrow" style={{ maxWidth: 480 }}>
      <div className="page-head">
        <h1>Sign in</h1>
        <p>For business owners. We&rsquo;ll email you a link; no password needed.</p>
      </div>
      {error && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
