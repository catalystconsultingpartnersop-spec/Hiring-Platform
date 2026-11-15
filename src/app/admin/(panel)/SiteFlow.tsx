import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { nowMs } from "@/lib/time";

// "Where owners go, and where they stop": how many visitors reached each step
// on the public site in the last 7 days. Counted by us, so it doesn't depend on
// any outside plan. Shown to managers on the dashboard.
type Row = { at: string; action: string; details: { step?: string; v?: string; ref?: string } };

export async function SiteFlow({ always = false }: { always?: boolean }) {
  const me = await requireStaff();
  if (!me.manager) return null;
  const now = nowMs();
  const since = new Date(now - 7 * 864e5).toISOString();
  // Midnight today in New York.
  const [hh, mm] = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number);
  const dayStart = now - (hh * 60 + mm) * 60e3;
  const { data } = await db()
    .from("activity_log")
    .select("at, action, details")
    .in("action", ["funnel", "owner_callback_request", "owner_meeting"])
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(5000);
  const all = (data ?? []) as Row[];
  // Only count from when step-counting began, so "sent" never looks bigger than "started".
  const first = all.filter((r) => r.action === "funnel").map((r) => r.at).sort()[0];
  if (!first)
    return always ? (
      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 19, margin: 0 }}>Where owners go, and where they stop</h2>
        <p className="muted" style={{ margin: "8px 0 0" }}>Nothing counted yet. This fills in as soon as someone opens the homepage.</p>
      </section>
    ) : null;
  const rows = all.filter((r) => r.at >= first);

  const people = (step: string, from = 0) => new Set(rows.filter((r) => r.action === "funnel" && r.details.step === step && Date.parse(r.at) >= from).map((r) => r.details.v ?? r.at)).size;
  const count = (action: string, from = 0) => rows.filter((r) => r.action === action && Date.parse(r.at) >= from).length;
  const home = people("home");
  const steps: { label: string; n: number; today: number; indent?: boolean; win?: boolean }[] = [
    { label: "Opened the homepage", n: home, today: people("home", dayStart) },
    { label: "Tapped “Talk to our team”", n: people("talk"), today: people("talk", dayStart), indent: true },
    { label: "Started the call-back form", n: people("form_started"), today: people("form_started", dayStart), indent: true },
    { label: "Sent the call-back form", n: count("owner_callback_request"), today: count("owner_callback_request", dayStart), indent: true, win: true },
    { label: "Tapped “Browse candidates yourself”", n: people("browse_click"), today: people("browse_click", dayStart), indent: true },
    { label: "Opened the browse page", n: people("browse"), today: people("browse", dayStart) },
    { label: "Opened “Need help?” while browsing", n: people("help_opened"), today: people("help_opened", dayStart), indent: true },
    { label: "Booked a video call", n: count("owner_meeting"), today: count("owner_meeting", dayStart), win: true },
  ];
  const max = Math.max(1, ...steps.map((s) => s.n));

  // Whose share link brought people in.
  const byRef = new Map<string, { visits: Set<string>; asked: number }>();
  for (const r of rows) {
    const ref = r.details.ref;
    if (!ref) continue;
    const e = byRef.get(ref) ?? { visits: new Set<string>(), asked: 0 };
    if (r.action === "funnel" && r.details.step === "home") e.visits.add(r.details.v ?? r.at);
    if (r.action !== "funnel") e.asked++;
    byRef.set(ref, e);
  }
  const refs = [...byRef.entries()].map(([name, e]) => ({ name, visits: e.visits.size, asked: e.asked })).filter((r) => r.visits || r.asked).sort((a, b) => b.visits - a.visits);

  const started = people("form_started");
  const sent = count("owner_callback_request");
  const note =
    started > sent && started >= 3
      ? `${started - sent} of ${started} people started the call-back form and didn't send it. That's the spot to watch.`
      : home >= 5 && people("browse") + people("talk") === 0
        ? "People are opening the homepage but not tapping either button yet."
        : null;

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 19, margin: 0 }}>Where owners go, and where they stop</h2>
        <span className="small muted">Last 7 days · visitors, not clicks</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 14.5 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--ink-2)", fontSize: 12.5 }}>
            <th style={{ fontWeight: 600, padding: "0 0 6px" }}>Step</th>
            <th style={{ fontWeight: 600, padding: "0 0 6px", width: 70, textAlign: "right" }}>7 days</th>
            <th style={{ fontWeight: 600, padding: "0 0 6px", width: 60, textAlign: "right" }}>Today</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.label} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "8px 0", paddingLeft: s.indent ? 18 : 0 }}>
                <div style={{ fontWeight: s.indent ? 400 : 700 }}>
                  {s.win ? "✓ " : ""}
                  {s.label}
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--wash)", marginTop: 5, maxWidth: 420 }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${Math.round((s.n / max) * 100)}%`, minWidth: s.n ? 6 : 0, background: s.win ? "var(--moss)" : "var(--marigold)" }} />
                </div>
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.n}</td>
              <td style={{ textAlign: "right", color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{s.today}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && (
        <p className="notice notice-gold small" style={{ margin: "12px 0 0" }}>
          {note}
        </p>
      )}
      {refs.length > 0 && (
        <p className="small" style={{ margin: "12px 0 0" }}>
          <b>Whose link brought them:</b>{" "}
          {refs.map((r, i) => (
            <span key={r.name}>
              {i ? " · " : ""}
              {r.name}: {r.visits} visit{r.visits === 1 ? "" : "s"}
              {r.asked ? `, ${r.asked} asked for a call` : ""}
            </span>
          ))}
        </p>
      )}
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Counted from {new Date(first).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}. Includes our own team&rsquo;s visits to the public site.
      </p>
    </section>
  );
}
