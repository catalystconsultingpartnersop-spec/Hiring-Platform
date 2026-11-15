import { ImageResponse } from "next/og";
import { justJoined } from "@/lib/joined";

// The "Just joined" posters, drawn on the spot: /share/joined/<candidate id>.png,
// <id>-status.png (tall, for WhatsApp status), week.png and week-status.png.
const NAVY = "#17213a";
const GOLD = "#f2b300";
const SOFT = "#c9d0e0";

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

const Check = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
    <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#3f7d4e" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const m = /^(week|[0-9a-f-]{36})(-status)?\.png$/i.exec(file);
  if (!m) return new Response("Not found", { status: 404 });
  const tall = !!m[2];
  const list = await justJoined();
  const one = m[1] === "week" ? null : list.find((j) => j.id === m[1]);
  if (m[1] !== "week" && !one) return new Response("Not found", { status: 404 });
  const week = list.filter((j) => Date.now() - Date.parse(j.listedAt) <= 7 * 864e5).slice(0, 4);
  if (!one && week.length < 2) return new Response("Not found", { status: 404 });

  const H = tall ? 1920 : 1350;
  const pad = tall ? 200 : 70;
  const band = tall ? 250 : 190;
  const big = (one?.role.length ?? 0) > 34 ? 52 : 62;

  const body = (
    <div style={{ width: 1080, height: H, display: "flex", flexDirection: "column", backgroundColor: NAVY, backgroundImage: "radial-gradient(circle at 0% 30%, #2a3660 0%, rgba(42,54,96,0) 55%)", color: "#fff", fontFamily: "I", fontWeight: 500, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: H - band, padding: `${pad}px 84px` }}>
        <div style={{ display: "flex", alignSelf: "flex-start", alignItems: "center", background: GOLD, color: NAVY, fontFamily: "B", fontWeight: 800, fontSize: 46, letterSpacing: -1, borderRadius: 999, padding: "14px 36px 17px 30px" }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: NAVY, marginRight: 16 }} />
          {one ? "Just joined the collection" : "New in the collection this week"}
        </div>
        {one ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 70, background: "#fff", color: NAVY, borderRadius: 28, padding: "44px 46px 40px", border: `6px solid ${GOLD}` }}>
            <div style={{ fontFamily: "B", fontWeight: 800, fontSize: big, lineHeight: 1.06, letterSpacing: -2 }}>{one.role}</div>
            {one.meta ? <div style={{ fontSize: 30, fontWeight: 700, marginTop: 18, color: "#3a4563" }}>{one.meta}</div> : null}
            {one.line ? <div style={{ fontSize: 35, lineHeight: 1.3, marginTop: 22 }}>{one.line.length > 130 ? one.line.slice(0, 127).replace(/\s+\S*$/, "") + "…" : one.line + "."}</div> : null}
            <div style={{ display: "flex", alignItems: "center", marginTop: 26, fontFamily: "B", fontWeight: 800, fontSize: 25, color: "#3f7d4e", letterSpacing: 0.5 }}>
              <Check />
              MET BY OUR TEAM
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
            {week.map((j) => (
              <div key={j.id} style={{ display: "flex", flexDirection: "column", background: "#fff", color: NAVY, borderRadius: 22, padding: "24px 32px 26px", marginBottom: 18 }}>
                <div style={{ fontFamily: "B", fontWeight: 800, fontSize: 40, lineHeight: 1.1, letterSpacing: -1 }}>{j.role}</div>
                {j.meta ? <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: "#3a4563" }}>{j.meta}</div> : null}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", marginTop: one ? 70 : 34, fontFamily: "B", fontWeight: 800, fontSize: 64, lineHeight: 1.06, letterSpacing: -2 }}>
          <div>Pre-vetted candidates.</div>
          <div style={{ color: GOLD }}>Handpicked by you.</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: SOFT }}>Hiring or not, come take a look.</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: band, display: "flex", flexDirection: "column", background: GOLD, color: NAVY, padding: "42px 84px 0", fontFamily: "B", fontWeight: 800 }}>
        <div style={{ fontSize: 28 }}>{one ? "See the full profile:" : "Browse them all:"}</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, letterSpacing: -1, marginTop: 2 }}>
          thecandidatecollection.com
          <svg width="44" height="44" viewBox="0 0 24 24" style={{ marginLeft: 14, marginTop: 6 }}>
            <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
  return new ImageResponse(body, {
    width: 1080,
    height: H,
    fonts: await loadFonts(new URL(req.url).origin),
    headers: { "Cache-Control": "public, max-age=600" },
  });
}
