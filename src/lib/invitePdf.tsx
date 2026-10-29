import path from "path";
import { Document, Font, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fillName, Invite, Item } from "./repInvite";

// The rep invitation as a real PDF, in the site's own colors and type.

const fontDir = path.join(process.cwd(), "src/assets/fonts");
let registered = false;
export function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Display",
    fonts: [
      { src: path.join(fontDir, "bricolage-grotesque-latin-700-normal.woff"), fontWeight: 700 },
      { src: path.join(fontDir, "bricolage-grotesque-latin-800-normal.woff"), fontWeight: 800 },
    ],
  });
  Font.register({
    family: "Text",
    fonts: [
      { src: path.join(fontDir, "instrument-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(fontDir, "instrument-sans-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(fontDir, "instrument-sans-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  registered = true;
}

const C = {
  ink: "#17213a",
  ink2: "#4a5570",
  ink3: "#7a8399",
  wash: "#eef1f6",
  white: "#ffffff",
  gold: "#f2b300",
  goldSoft: "#fff1c2",
  goldInk: "#7a5900",
  moss: "#2f6b47",
  mossSoft: "#e3f0e7",
};

const s = StyleSheet.create({
  page: { fontFamily: "Text", fontSize: 10, color: C.ink, paddingVertical: 40, paddingHorizontal: 40, lineHeight: 1.45 },
  from: { fontSize: 8, fontWeight: 700, letterSpacing: 1.4, color: C.ink3, textTransform: "uppercase" },
  h1: { fontFamily: "Display", fontWeight: 800, fontSize: 32, lineHeight: 1.12, marginTop: 8 },
  lede: { fontSize: 12.5, color: C.ink2, marginTop: 10, maxWidth: 420 },
  thesis: { fontFamily: "Display", fontWeight: 700, fontSize: 19, lineHeight: 1.2, marginTop: 22 },
  flow: { marginTop: 20, backgroundColor: C.wash, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center" },
  side: { width: 148 },
  middle: { flex: 1 },
  arrow: { width: 18, alignItems: "center" },
  tagRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  tag: { fontSize: 6.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  tagNote: { fontSize: 7, color: C.ink3, marginLeft: 5 },
  step: { flexDirection: "row", backgroundColor: C.white, borderRadius: 8, padding: 8, marginTop: 7 },
  num: { width: 13, height: 13, borderRadius: 7, alignItems: "center", justifyContent: "center", marginRight: 6 },
  numT: { fontSize: 7, fontWeight: 700, lineHeight: 1 },
  stepT: { fontSize: 9, fontWeight: 700, lineHeight: 1.25 },
  stepD: { fontSize: 7.8, color: C.ink2, lineHeight: 1.3, marginTop: 1 },
  midHead: { textAlign: "center", fontFamily: "Display", fontWeight: 700, fontSize: 12, lineHeight: 1.2 },
  midSub: { textAlign: "center", fontSize: 7, color: C.ink3, marginTop: 1, marginBottom: 2 },
  card: { backgroundColor: C.white, borderRadius: 8, padding: 8, marginTop: 7, borderWidth: 0.5, borderColor: "#d9dee8" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  role: { fontSize: 6, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: C.ink3 },
  lock: { fontSize: 6, fontWeight: 600, color: C.ink2, backgroundColor: C.wash, borderRadius: 6, paddingVertical: 1.5, paddingHorizontal: 5 },
  cardH: { fontSize: 9.5, fontWeight: 700, marginTop: 3, lineHeight: 1.25 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 3 },
  chip: { fontSize: 6.3, fontWeight: 600, color: C.moss, backgroundColor: C.mossSoft, borderRadius: 6, paddingVertical: 1.5, paddingHorizontal: 5, marginRight: 3, marginTop: 2 },
  chipPlain: { fontSize: 6.3, color: C.ink2, backgroundColor: C.wash, borderRadius: 6, paddingVertical: 1.5, paddingHorizontal: 5, marginRight: 3, marginTop: 2 },
  vetted: { textAlign: "center", fontSize: 7, fontWeight: 700, color: C.moss, marginTop: 6 },
  caption: { textAlign: "center", fontSize: 10, color: C.ink2, marginTop: 12 },
  twoCol: { flexDirection: "row", gap: 12 },
  why: { flex: 1, borderRadius: 14, padding: 13 },
  whyH: { fontFamily: "Display", fontWeight: 700, fontSize: 15, lineHeight: 1.2, marginBottom: 2 },
  whyT: { fontSize: 9.5, fontWeight: 700, marginTop: 6 },
  whyD: { fontSize: 8.5, color: C.ink2, lineHeight: 1.35 },
  youRow: { flexDirection: "row", gap: 18, marginTop: 18 },
  youH: { fontFamily: "Display", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 2 },
  youP: { fontSize: 9.5, color: C.ink2, marginTop: 6, lineHeight: 1.4 },
  qual: { width: 190, backgroundColor: C.ink, borderRadius: 14, padding: 14, color: C.white },
  qualLabel: { fontSize: 7, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.gold, marginBottom: 4 },
  qualLi: { flexDirection: "row", marginTop: 5, fontSize: 9.5, lineHeight: 1.35 },
  qualFoot: { fontFamily: "Display", fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: C.gold, marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#3a4766" },
  close: { marginTop: 18, borderTopWidth: 1.5, borderTopColor: C.ink, paddingTop: 14 },
  closeH: { fontFamily: "Display", fontWeight: 800, fontSize: 22, lineHeight: 1.2 },
  closeP: { fontSize: 10.5, color: C.ink2, marginTop: 4, maxWidth: 440, lineHeight: 1.4 },
  links: { flexDirection: "row", gap: 10, marginTop: 12 },
  linkBox: { borderWidth: 1, borderColor: C.ink, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, textDecoration: "none", color: C.ink },
  linkLabel: { fontSize: 6.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.ink3 },
  linkUrl: { fontSize: 9.5, fontWeight: 700, marginTop: 1 },
  sig: { fontFamily: "Display", fontWeight: 700, fontSize: 18, lineHeight: 1.2, marginTop: 12 },
});

function Check({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={3} fill="none" />
    </Svg>
  );
}

function Arrow() {
  return (
    <View style={s.arrow}>
      <Svg width={12} height={12} viewBox="0 0 24 24">
        <Path d="M5 12h14M13 6l6 6-6 6" stroke={C.ink3} strokeWidth={2.4} fill="none" />
      </Svg>
    </View>
  );
}

function Steps({ items, tag, note, kind }: { items: Item[]; tag: string; note: string; kind: "c" | "o" }) {
  const tone = kind === "c" ? { backgroundColor: C.mossSoft, color: C.moss } : { backgroundColor: C.goldSoft, color: C.goldInk };
  const dot = kind === "c" ? { backgroundColor: C.moss, color: C.white } : { backgroundColor: C.gold, color: C.ink };
  return (
    <View style={s.side}>
      <View style={s.tagRow}>
        <Text style={[s.tag, tone]}>{tag}</Text>
        <Text style={s.tagNote}>{note}</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={s.step} wrap={false}>
          <View style={[s.num, { backgroundColor: dot.backgroundColor }]}>
            <Text style={[s.numT, { color: dot.color }]}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.stepT}>{it.t}</Text>
            {it.d ? <Text style={s.stepD}>{it.d}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Why({ title, items, bg }: { title: string; items: Item[]; bg: string }) {
  return (
    <View style={[s.why, { backgroundColor: bg }]}>
      <Text style={s.whyH}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} wrap={false}>
          <Text style={s.whyT}>{it.t}</Text>
          {it.d ? <Text style={s.whyD}>{it.d}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function InviteDoc({ inv, name, brand, site }: { inv: Invite; name: string; brand: string; site: string }) {
  const n = (x: string) => fillName(x, name);
  const short = site.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return (
    <Document title={`${brand}: an invitation for ${name.trim() || "you"}`} author={inv.signature}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.from}>{n(inv.from)}</Text>
        <Text style={s.h1}>{n(inv.headline)}</Text>
        <Text style={s.lede}>{n(inv.lede)}</Text>
        <Text style={s.thesis}>
          <Text style={{ color: C.moss }}>{n(inv.thesisA)}</Text> <Text style={{ color: C.goldInk }}>{n(inv.thesisB)}</Text>
        </Text>

        <View style={s.flow} wrap={false}>
          <Steps items={inv.candidateSteps} tag="For candidates" note="always free" kind="c" />
          <Arrow />
          <View style={s.middle}>
            <Text style={s.midHead}>{brand}</Text>
            <Text style={s.midSub}>Strengths first. Names private.</Text>
            {inv.profiles.map((p, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.role}>{p.role}</Text>
                  <Text style={s.lock}>Name private</Text>
                </View>
                <Text style={s.cardH}>{p.headline}</Text>
                <View style={s.chips}>
                  {p.strengths
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((x) => (
                      <Text key={x} style={s.chip}>
                        {x}
                      </Text>
                    ))}
                  {p.years ? <Text style={s.chipPlain}>{p.years}</Text> : null}
                </View>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 6 }}>
              <Check color={C.moss} />
              <Text style={[s.vetted, { marginTop: 0, marginLeft: 4 }]}>Every one met in person by a rep</Text>
            </View>
          </View>
          <Arrow />
          <Steps items={inv.ownerSteps} tag="For owners" note="pay only on hire" kind="o" />
        </View>
        <Text style={s.caption}>{n(inv.caption)}</Text>
      </Page>

      <Page size="LETTER" style={s.page}>
        <View style={s.twoCol}>
          <Why title="Why candidates love it" items={inv.candidatesLove} bg={C.mossSoft} />
          <Why title="Why owners love it" items={inv.ownersLove} bg={C.goldSoft} />
        </View>

        <View style={s.youRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.youH}>{n(inv.youTitle)}</Text>
            {inv.you.map((p, i) => (
              <Text key={i} style={s.youP}>
                {p.t ? <Text style={{ color: C.ink, fontWeight: 700 }}>{n(p.t)} </Text> : null}
                {n(p.d)}
              </Text>
            ))}
          </View>
          <View style={s.qual} wrap={false}>
            <Text style={s.qualLabel}>Who I’m looking for</Text>
            {inv.qualities.filter(Boolean).map((q, i) => (
              <View key={i} style={s.qualLi}>
                <View style={{ width: 15, paddingTop: 2.5 }}>
                  <Check color={C.gold} size={9} />
                </View>
                <Text style={{ flex: 1 }}>{n(q)}</Text>
              </View>
            ))}
            <Text style={s.qualFoot}>{n(inv.qualitiesFooter)}</Text>
          </View>
        </View>

        <View style={s.close} wrap={false}>
          <Text style={s.closeH}>{n(inv.closeTitle)}</Text>
          <Text style={s.closeP}>{n(inv.closeText)}</Text>
          <View style={s.links}>
            <Link src={`${site}/mission`} style={s.linkBox}>
              <Text style={s.linkLabel}>Our mission</Text>
              <Text style={s.linkUrl}>{short}/mission</Text>
            </Link>
            <Link src={site} style={s.linkBox}>
              <Text style={s.linkLabel}>See more</Text>
              <Text style={s.linkUrl}>{short}</Text>
            </Link>
          </View>
          <Text style={s.sig}>{n(inv.signature)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function invitePdf(p: { inv: Invite; name: string; brand: string; site: string }) {
  registerFonts();
  return renderToBuffer(<InviteDoc {...p} />);
}
