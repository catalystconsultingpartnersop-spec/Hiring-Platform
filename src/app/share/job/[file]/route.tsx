import { ImageResponse } from "next/og";
import { currentStaff } from "@/lib/session";
import { getPosition } from "@/lib/positions";
import { openingProfile } from "@/lib/openings";
import { jobPosterDefaults } from "@/lib/jobPoster";

// A job opening as a poster for candidates: /share/job/<opening id>-status.png (tall,
// for WhatsApp status) or <id>.png (square-ish, for chats). Team only. The rep can
// change the words with ?t= (title) &m= (place, hours, pay) &l= (a line, up to 3).
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
  <svg width="38" height="38" viewBox="0 0 24 24" style={{ marginRight: 16, marginTop: 4, flexShrink: 0 }}>
    <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={GOLD} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  if (!(await currentStaff())) return new Response("Not found", { status: 404 });
  const { file } = await ctx.params;
  const m = /^([0-9a-f-]{36})(-status)?\.png$/i.exec(file);
  if (!m) return new Response("Not found", { status: 404 });
  const p = await getPosition(m[1]);
  if (!p) return new Response("Not found", { status: 404 });
  const d = jobPosterDefaults(p, await openingProfile(p.id));
  const q = new URL(req.url).searchParams;
  const clip = (s: string | null, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const title = clip(q.get("t"), 60) || d.title;
  const meta = q.has("m") ? clip(q.get("m"), 80) : d.meta;
  const lines = (q.getAll("l").length ? q.getAll("l") : d.lines).map((l) => clip(l, 60)).filter(Boolean).slice(0, 3);
  const tall = !!m[2];
  const H = tall ? 1920 : 1350;
  const band = tall ? 300 : 200;
  const size = title.length > 34 ? 84 : title.length > 22 ? 100 : 118;

  const body = (
    <div style={{ width: 1080, height: H, display: "flex", flexDirection: "column", backgroundColor: NAVY, backgroundImage: "radial-gradient(circle at 0% 30%, #2a3660 0%, rgba(42,54,96,0) 55%)", color: "#fff", fontFamily: "I", fontWeight: 500, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: H - band, padding: tall ? "120px 84px" : "64px 84px" }}>
        <div style={{ display: "flex", alignSelf: "flex-start", alignItems: "center", background: GOLD, color: NAVY, fontFamily: "B", fontWeight: 800, fontSize: 46, letterSpacing: -1, borderRadius: 999, padding: "14px 36px 17px 30px" }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: NAVY, marginRight: 16 }} />
          Looking for work?
        </div>
        <div style={{ marginTop: tall ? 70 : 44, fontFamily: "B", fontWeight: 800, fontSize: 54, letterSpacing: -1.5, color: SOFT }}>Now hiring:</div>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "B", fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: -3, color: GOLD }}>{title}</div>
        {meta ? <div style={{ display: "flex", marginTop: 30, fontSize: 40, fontWeight: 700, color: "#fff" }}>{meta}</div> : null}
        {lines.length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: tall ? 70 : 44 }}>
            <div style={{ fontSize: 34, color: SOFT, marginBottom: 18 }}>You&rsquo;d be great if you&rsquo;re:</div>
            {lines.map((l) => (
              <div key={l} style={{ display: "flex", alignItems: "flex-start", fontSize: 42, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
                <Check />
                {l}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: band, display: "flex", flexDirection: "column", background: GOLD, color: NAVY, padding: tall ? "56px 84px 0" : "40px 84px 0", fontFamily: "B", fontWeight: 800 }}>
        <div style={{ fontSize: 30 }}>Interested, or know someone? Start here:</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 50, letterSpacing: -1, marginTop: 4 }}>
          thecandidatecollection.com/join
          <svg width="44" height="44" viewBox="0 0 24 24" style={{ marginLeft: 14, marginTop: 6 }}>
            <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
  return new ImageResponse(body, { width: 1080, height: H, fonts: await loadFonts(new URL(req.url).origin), headers: { "Cache-Control": "private, max-age=60" } });
}
