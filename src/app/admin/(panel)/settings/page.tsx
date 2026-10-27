import { requireAdmin } from "@/lib/session";
import { getTiers } from "@/lib/catalog";
import { addTier, removeTier } from "../../actions";
import { TiersForm } from "./TiersForm";

export default async function SettingsPage() {
  await requireAdmin();
  const tiers = await getTiers();
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
    </div>
  );
}
