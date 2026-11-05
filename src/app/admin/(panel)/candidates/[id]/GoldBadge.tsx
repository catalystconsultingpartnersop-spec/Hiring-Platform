import { setGold } from "@/app/admin/actions";
import { dateShort } from "@/lib/format";
import { GOLD_SOFT_LIMIT, type Gold } from "@/lib/gold";
import { PendingButton } from "@/components/PendingButton";

// Gold standard: the interviewing rep's "worth placing" badge. Team only.
export function GoldBadge({ candidateId, first, gold, canEdit, myGoldCount }: { candidateId: string; first: string; gold: Gold | null; canEdit: boolean; myGoldCount: number }) {
  if (gold)
    return (
      <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg,#fff3c4,#ffe08a)", border: "1.5px solid #e2a800", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div>
          <strong style={{ fontSize: 17 }}>⭐ Gold standard</strong>
          <span className="small" style={{ marginLeft: 8 }}>
            says {gold.by_name.split(" ")[0]}
            {gold.at ? `, ${dateShort(gold.at)}` : ""}
          </span>
          {gold.why && <div style={{ marginTop: 2 }}>&ldquo;{gold.why}&rdquo;</div>}
          <div className="small muted" style={{ marginTop: 2 }}>Only our team sees this. Worth focusing on to place.</div>
        </div>
        {canEdit && (
          <form action={setGold.bind(null, candidateId, false)}>
            <PendingButton className="btn btn-ghost btn-small" pendingText="Removing…">
              Remove gold
            </PendingButton>
          </form>
        )}
      </div>
    );
  if (!canEdit) return null;
  return (
    <details style={{ marginTop: 12 }}>
      <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>
        ⭐ Is {first} a gold standard candidate?
      </summary>
      <form action={setGold.bind(null, candidateId, true)} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <input className="input" name="why" maxLength={140} placeholder="Why, in a few words (optional)" style={{ flex: "1 1 260px" }} />
        <PendingButton className="btn btn-gold btn-small" pendingText="Saving…">
          Mark as gold
        </PendingButton>
      </form>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        Only our team sees it. It tells other reps this one is worth placing.
        {myGoldCount >= GOLD_SOFT_LIMIT ? ` You already have ${myGoldCount} gold candidates. Gold works best when it's rare.` : ""}
      </p>
    </details>
  );
}
