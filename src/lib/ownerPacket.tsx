import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { availabilityLabel } from "./availability";
import { db } from "./db";
import { brandName, LEVEL_LABEL, salaryRange, WORK_MODE_LABEL } from "./format";
import { registerFonts } from "./invitePdf";
import { describe, profileOf, TRAITS } from "./strengths";

// What an owner gets with a candidate once they've signed: the resume, plus a
// one-page "About" summary (who they are, strengths, where they'll want support),
// attached to their emails so they (or a partner) can read it anywhere.

type Row = {
  id: string;
  full_name: string;
  headline: string | null;
  summary: string | null;
  highlights: string[] | null;
  role_category: string | null;
  industry: string | null;
  level: string | null;
  work_mode: string | null;
  location_region: string | null;
  salary_min: number | null;
  salary_max: number | null;
  working_genius: string | null;
  resume_path: string | null;
  application: Record<string, string> | null;
};

const safe = (n: string) => n.replace(/[^\p{L}\p{N} .'-]/gu, "").trim() || "Candidate";

async function load(id: string) {
  const { data } = await db()
    .from("candidates")
    .select("id, full_name, headline, summary, highlights, role_category, industry, level, work_mode, location_region, salary_min, salary_max, working_genius, resume_path, application")
    .eq("id", id)
    .maybeSingle();
  return data as Row | null;
}

// The resume exactly as owners get it from the site (our clean version if the team chose it).
export async function ownerResumeFile(id: string): Promise<{ filename: string; content: Buffer } | null> {
  const c = await load(id);
  if (!c) return null;
  const who = safe(c.full_name);
  const app = c.application ?? {};
  try {
    if (app.owner_resume === "clean" && app.clean_resume) {
      const { cleanResumePdf } = await import("./cleanResumePdf");
      return { filename: `${who} - Resume.pdf`, content: await cleanResumePdf(app.clean_resume) };
    }
    if (!c.resume_path) return null;
    const { data: file } = await db().storage.from("resumes").download(c.resume_path);
    if (!file) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    if (/\.docx$/i.test(c.resume_path)) {
      const { wordResumeToPdf } = await import("./resumePdf");
      return { filename: `${who} - Resume.pdf`, content: await wordResumeToPdf(buf, `${who} - Resume`, brandName()) };
    }
    const ext = c.resume_path.split(".").pop()?.toLowerCase() ?? "pdf";
    return { filename: `${who} - Resume.${ext}`, content: buf };
  } catch (e) {
    console.error("owner resume", e);
    return null;
  }
}

const INK = "#17213a";
const SOFT = "#5b667e";
const GOLD = "#b98a00";
const s = StyleSheet.create({
  page: { fontFamily: "Text", fontSize: 10.5, lineHeight: 1.45, color: INK, paddingTop: 42, paddingBottom: 46, paddingHorizontal: 50 },
  kicker: { fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: GOLD, fontWeight: 700 },
  name: { fontFamily: "Display", fontWeight: 800, fontSize: 24, lineHeight: 1.2, marginTop: 4 },
  headline: { fontSize: 12.5, fontWeight: 600, marginTop: 2 },
  facts: { marginTop: 6, color: SOFT, fontSize: 9.5 },
  rule: { marginTop: 12, marginBottom: 4, borderBottomWidth: 1.5, borderBottomColor: GOLD },
  h: { fontFamily: "Display", fontWeight: 700, fontSize: 11.5, marginTop: 14, marginBottom: 4 },
  p: { marginBottom: 3 },
  type: { fontFamily: "Display", fontWeight: 700, fontSize: 13 },
  li: { flexDirection: "row", marginTop: 2 },
  dot: { width: 12, color: GOLD },
  liText: { flex: 1 },
  cols: { flexDirection: "row", gap: 18 },
  col: { flex: 1 },
  foot: { position: "absolute", bottom: 24, left: 50, right: 50, fontSize: 8.5, color: SOFT, textAlign: "center" },
});

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((t, i) => (
        <View key={i} style={s.li}>
          <Text style={s.dot}>•</Text>
          <Text style={s.liText}>{t}</Text>
        </View>
      ))}
    </>
  );
}

export async function summaryPdf(id: string): Promise<{ filename: string; content: Buffer } | null> {
  const c = await load(id);
  if (!c) return null;
  registerFonts();
  const app = c.application ?? {};
  const p = profileOf(c.working_genius);
  const d = describe(c.working_genius);
  const typeName = (app.type_label ?? "").trim() || d?.name || "";
  const typeLine = (app.best_line ?? "").trim() || d?.line || "";
  const facts = [
    [c.role_category, c.industry].filter(Boolean).join(" in "),
    c.level ? LEVEL_LABEL[c.level] : null,
    c.location_region,
    c.work_mode ? WORK_MODE_LABEL[c.work_mode] : null,
    salaryRange(c.salary_min, c.salary_max),
    app.available ? availabilityLabel(app.available) : null,
  ].filter(Boolean) as string[];
  const doc = (
    <Document title={`About ${c.full_name}`} author={brandName()}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.kicker}>Candidate summary · {brandName()}</Text>
        <Text style={s.name}>{c.full_name}</Text>
        {c.headline ? <Text style={s.headline}>{c.headline}</Text> : null}
        {facts.length ? <Text style={s.facts}>{facts.join("  ·  ")}</Text> : null}
        <View style={s.rule} />

        {c.summary ? (
          <>
            <Text style={s.h}>Who they are</Text>
            <Text style={s.p}>{c.summary}</Text>
          </>
        ) : null}

        {typeName ? (
          <>
            <Text style={s.h}>The kind of person they are</Text>
            <Text style={s.type}>{typeName}</Text>
            {typeLine ? <Text style={s.p}>{typeLine}</Text> : null}
            {d?.thrives ? <Text style={s.p}>{d.thrives}</Text> : null}
          </>
        ) : null}

        {p.primary.length ? (
          <View style={s.cols}>
            <View style={s.col}>
              <Text style={s.h}>Natural strengths</Text>
              <Bullets items={p.primary.map((l) => `${TRAITS[l].label}: ${TRAITS[l].short.toLowerCase()}`)} />
              {p.secondary.length ? (
                <>
                  <Text style={s.h}>Also does well</Text>
                  <Bullets items={p.secondary.map((l) => `${TRAITS[l].label}: ${TRAITS[l].short.toLowerCase()}`)} />
                </>
              ) : null}
            </View>
            {p.draining.length ? (
              <View style={s.col}>
                <Text style={s.h}>Where they&apos;ll want support</Text>
                <Bullets items={p.draining.map((l) => `${TRAITS[l].label} is less natural for them`)} />
                {d?.bestAlongside ? <Text style={[s.p, { marginTop: 6 }]}>{d.bestAlongside}</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {(c.highlights ?? []).length ? (
          <>
            <Text style={s.h}>Highlights</Text>
            <Bullets items={c.highlights ?? []} />
          </>
        ) : null}

        <Text style={s.foot} fixed>
          Met one-on-one by our team before being listed. Strengths come from their Strengths Assessment and our conversation with them.
        </Text>
      </Page>
    </Document>
  );
  return { filename: `${safe(c.full_name)} - Summary.pdf`, content: await renderToBuffer(doc) };
}

// Both, ready to attach to an email. Anything that can't be made is just left out.
export async function packetAttachments(id: string) {
  const [resume, summary] = await Promise.all([ownerResumeFile(id).catch(() => null), summaryPdf(id).catch(() => null)]);
  return [summary, resume].filter(Boolean) as { filename: string; content: Buffer }[];
}
