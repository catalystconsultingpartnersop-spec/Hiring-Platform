import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { parseCleanResume, type ResumeEntry } from "./cleanResume";
import { registerFonts } from "./invitePdf";

// The clean resume as a simple, professional PDF. No branding: it's the candidate's resume.

const INK = "#17213a";
const SOFT = "#5b667e";
const LINE = "#d9dee8";
const ACCENT = "#b98a00";

const s = StyleSheet.create({
  page: { fontFamily: "Text", fontSize: 10, lineHeight: 1.42, color: INK, paddingTop: 44, paddingBottom: 44, paddingHorizontal: 50 },
  name: { fontFamily: "Display", fontWeight: 800, fontSize: 24, lineHeight: 1.1 },
  contact: { marginTop: 4, color: SOFT, fontSize: 9.5 },
  headline: { marginTop: 8, fontSize: 11.5, fontWeight: 600 },
  rule: { marginTop: 12, borderBottomWidth: 1.5, borderBottomColor: ACCENT },
  section: { marginTop: 14 },
  sectionTitle: { fontFamily: "Display", fontWeight: 700, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: INK, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: LINE, marginBottom: 6 },
  entry: { marginBottom: 8 },
  entryHead: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  entryTitle: { fontWeight: 700, fontSize: 10.5, flexShrink: 1 },
  entryWhen: { color: SOFT, fontSize: 9.5, flexShrink: 0 },
  entrySub: { color: SOFT, fontSize: 9.5, marginTop: 1 },
  p: { marginBottom: 3 },
  li: { flexDirection: "row", marginTop: 2 },
  dot: { width: 10, color: ACCENT },
  liText: { flex: 1 },
});

const looksLikeDate = (x: string) => /\b(19|20)\d{2}\b|present|current/i.test(x);

function Entry({ e }: { e: ResumeEntry }) {
  const head = [...e.head];
  const when = head.length > 1 && looksLikeDate(head[head.length - 1]) ? head.pop()! : "";
  const [title, ...rest] = head;
  return (
    <View style={s.entry} wrap={false}>
      <View style={s.entryHead}>
        <Text style={s.entryTitle}>{title}</Text>
        {when ? <Text style={s.entryWhen}>{when}</Text> : null}
      </View>
      {rest.length ? <Text style={s.entrySub}>{rest.join(" · ")}</Text> : null}
      {e.lines.map((l, i) => (
        <Text key={i} style={s.p}>
          {l}
        </Text>
      ))}
      {e.bullets.map((b, i) => (
        <View key={i} style={s.li}>
          <Text style={s.dot}>•</Text>
          <Text style={s.liText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export async function cleanResumePdf(text: string): Promise<Buffer> {
  registerFonts();
  const r = parseCleanResume(text);
  const doc = (
    <Document title={`${r.name} - Resume`} author={r.name}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{r.name}</Text>
        {r.contact ? <Text style={s.contact}>{r.contact}</Text> : null}
        {r.headline ? <Text style={s.headline}>{r.headline}</Text> : null}
        <View style={s.rule} />
        {r.sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            {sec.lines.map((l, j) => (
              <Text key={j} style={s.p}>
                {l}
              </Text>
            ))}
            {sec.bullets.map((b, j) => (
              <View key={j} style={s.li}>
                <Text style={s.dot}>•</Text>
                <Text style={s.liText}>{b}</Text>
              </View>
            ))}
            {sec.entries.map((e, j) => (
              <Entry key={j} e={e} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
