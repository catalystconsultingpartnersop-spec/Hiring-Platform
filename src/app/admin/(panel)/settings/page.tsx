import { requireAdmin } from "@/lib/session";
import { getTiers } from "@/lib/catalog";
import { callsAccount, callsRedirectUri, googleCallsConfigured } from "@/lib/googleCalls";
import { dateShort } from "@/lib/format";
import { addTier, removeTier, disconnectGoogleCalls } from "../../actions";
import { TiersForm } from "./TiersForm";
import { TestRoom } from "./TestRoom";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const [tiers, acct] = await Promise.all([getTiers(), callsAccount()]);
  const configured = googleCallsConfigured();
  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Fees</h1>
        <p>
          The default flat fee depends on the candidate&rsquo;s expected salary (the top of their range). You can
          still override it on any single candidate.
        </p>
      </div>
      <TiersForm tiers={tiers} removeTier={removeTier} />
      <form action={addTier} style={{ marginTop: 14 }}>
        <button className="btn btn-ghost btn-small" type="submit">
          Add a tier
        </button>
      </form>

      <section id="calls" className="panel" style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Recorded onboarding calls</h2>
        <p className="small muted" style={{ margin: "6px 0 14px" }}>
          Connect one company Google account. Every onboarding call then gets its own Google Meet room that records and
          takes notes on its own. Reps keep their own email; they just get the link.
        </p>
        {sp.google === "connected" && <p className="notice notice-good">Connected. New bookings get their own recorded Meet room.</p>}
        {sp.google === "failed" && (
          <p className="notice notice-bad">That didn&rsquo;t connect{typeof sp.why === "string" ? `: ${sp.why}` : "."} Try again.</p>
        )}
        {acct ? (
          <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>
              Connected as <strong>{acct.email}</strong> since {dateShort(acct.connected_at)}.
            </span>
            <form action={disconnectGoogleCalls}>
              <button className="btn btn-ghost btn-small" type="submit">
                Disconnect
              </button>
            </form>
          </div>
          <TestRoom />
          </>
        ) : configured ? (
          <a className="btn btn-gold btn-small" href="/api/google/calls/start">
            Connect Google
          </a>
        ) : (
          <p className="notice" style={{ margin: 0 }}>
            Not set up yet. Google needs this return address on file: <code>{callsRedirectUri()}</code>
          </p>
        )}
      </section>
    </div>
  );
}
