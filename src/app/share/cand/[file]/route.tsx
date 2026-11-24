import { ImageResponse } from "next/og";
import { currentStaff } from "@/lib/session";
import { db } from "@/lib/db";
import { candPosterDefaults } from "@/lib/candPoster";
import { posterTheme } from "@/lib/posterThemes";

// A candidate as a teaser poster for business owners: /share/cand/<id>-status.png (tall,
// WhatsApp status) or <id>.png (for chats). Team only, listed candidates only, never a name.
// Words: ?t= title, m= where/level/hours, y= type, e= experience, g= great at, d= good at.
// Colors: ?th= navy | gold | light.



let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 500 | 700 | 800; style: "normal" }[]> | null = null;
function loadFonts(origin: string) {
  fonts ??= Promise.all(
    ([
      ["B", "bricolage-800.woff", 800],
      ["I", "instrument-500.woff", 500],
      ["I", "instrument-700.woff", 700],
    ] as const).map(async ([name, file, weight]) => ({ name, weight, style: "normal" as const, data: await (await fetch(`${origin}/fonts/${file}`)).arrayBuffer() })),
  ).catch((e) => {
    fonts = null;
    throw e;
  });
  return fonts;
}

export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  if (!(await currentStaff())) return new Response("Not found", { status: 404 });
  const { file } = await ctx.params;
  const m = /^([0-9a-f-]{36})(-status)?\.png$/i.exec(file);
  if (!m) return new Response("Not found", { status: 404 });
  const { data: c } = await db().from("candidates").select("id, full_name, headline, role_category, also_roles, level, location_region, working_genius, application, status").eq("id", m[1]).maybeSingle();
  if (!c || c.status !== "listed") return new Response("Not found", { status: 404 });
  const d = candPosterDefaults(c as unknown as Parameters<typeof candPosterDefaults>[0]);
  const q = new URL(req.url).searchParams;
  const pick = (k: string, def: string, n: number) => (q.has(k) ? (q.get(k) ?? "") : def).replace(/\s+/g, " ").trim().slice(0, n);
  const title = pick("t", d.title, 60) || d.title;
  const meta = pick("m", d.meta, 80);
  const type = pick("y", d.type, 40);
  const exp = pick("e", d.experience, 80);
  const great = pick("g", d.great, 70);
  const good = pick("d", d.good, 70);
  const th = posterTheme(q.get("th"));

  const tall = !!m[2];
  const H = tall ? 1920 : 1350;
  const band = tall ? 300 : 200;
  const topH = tall ? 230 : 160;
  const size = title.length > 34 ? 84 : title.length > 22 ? 100 : 118;
  const rows: [string, string][] = ([["Experience", exp], ["Great at", great], ["Good at", good]] as [string, string][]).filter(([, v]) => v);

  const body = (
    <div style={{ width: 1080, height: H, display: "flex", flexDirection: "column", backgroundColor: th.bg, backgroundImage: th.grad, color: th.ink, fontFamily: "I", fontWeight: 500, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", height: topH, background: th.top, color: th.topInk, padding: "0 84px", fontFamily: "B", fontWeight: 800, fontSize: tall ? 76 : 64, letterSpacing: -2 }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: th.topInk, marginRight: 26 }} />
        Candidate available
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: H - band - topH, padding: tall ? "60px 84px" : "40px 84px" }}>
        <div style={{ display: "flex", fontFamily: "B", fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: -3, color: th.accent }}>{title}</div>
        {type ? <div style={{ display: "flex", marginTop: 18, fontFamily: "B", fontWeight: 800, fontSize: 46, letterSpacing: -1, color: th.ink }}>{`A natural ${type.toLowerCase()}`}</div> : null}
        {meta ? <div style={{ display: "flex", marginTop: 14, fontSize: 36, fontWeight: 700, color: th.soft }}>{meta}</div> : null}
        {rows.length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: tall ? 64 : 40, background: th.card, border: `2px solid ${th.cardLine}`, borderRadius: 30, padding: "14px 40px" }}>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", padding: "22px 0", borderTop: i ? `2px solid ${th.cardLine}` : "none" }}>
                <div style={{ fontFamily: "B", fontWeight: 800, fontSize: 26, letterSpacing: 2, color: th.accent }}>{k.toUpperCase()}</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 42, fontWeight: 700, lineHeight: 1.2 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: band, display: "flex", flexDirection: "column", background: th.band, color: th.bandInk, padding: tall ? "56px 84px 0" : "40px 84px 0", fontFamily: "B", fontWeight: 800 }}>
        <div style={{ fontSize: 30 }}>Met by our team. Want to meet them?</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 50, letterSpacing: -1, marginTop: 4 }}>
          thecandidatecollection.com
          <svg width="44" height="44" viewBox="0 0 24 24" style={{ marginLeft: 14, marginTop: 6 }}>
            <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke={th.bandInk} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
  return new ImageResponse(body, { width: 1080, height: H, fonts: await loadFonts(new URL(req.url).origin), headers: { "Cache-Control": "private, max-age=60" } });
}
