import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { registerFonts } from "./invitePdf";

// Word resumes become a clean PDF for owners, so everyone gets the same,
// easy-to-open file. Layout is simplified; the words are all there.

type Run = { text: string; bold?: boolean; italic?: boolean; href?: string };
type Block = { kind: "h1" | "h2" | "h3" | "p" | "li"; runs: Run[]; marker?: string; depth?: number };

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

// Turns mammoth's simple HTML into paragraphs, headings and list items.
export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let cur = null as Block | null;
  const at = () => cur as Block | null;
  let bold = 0, italic = 0;
  let href: string | undefined;
  const lists: { ordered: boolean; n: number }[] = [];
  let rowCells = -1; // -1 when not inside a table row
  const start = (kind: Block["kind"], extra: Partial<Block> = {}) => {
    flush();
    cur = { kind, runs: [], ...extra };
  };
  const flush = () => {
    if (cur && cur.runs.some((r) => r.text.trim())) blocks.push(cur);
    cur = null;
  };
  const re = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, close, rawTag, attrs, text] = m;
    if (text !== undefined) {
      const t = decode(text);
      if (!cur) start("p");
      at()!.runs.push({ text: t, bold: bold > 0, italic: italic > 0, href });
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (tag === "strong" || tag === "b") bold += close ? -1 : 1;
    else if (tag === "em" || tag === "i") italic += close ? -1 : 1;
    else if (tag === "a") href = close ? undefined : attrs.match(/href="([^"]+)"/)?.[1];
    else if (tag === "br") at()?.runs.push({ text: "\n" });
    else if (tag === "ul" || tag === "ol") {
      if (close) lists.pop();
      else lists.push({ ordered: tag === "ol", n: 0 });
    } else if (tag === "li") {
      if (close) flush();
      else {
        const l = lists[lists.length - 1];
        if (l) l.n++;
        start("li", { marker: l?.ordered ? `${l.n}.` : "•", depth: Math.max(0, lists.length - 1) });
      }
    } else if (/^h[1-6]$/.test(tag)) {
      if (close) flush();
      else start(tag === "h1" ? "h1" : tag === "h2" ? "h2" : "h3");
    } else if (tag === "tr") {
      // A table row reads as one line: "Skills: QuickBooks, Asana".
      if (close) {
        flush();
        rowCells = -1;
      } else {
        start("p");
        rowCells = 0;
      }
    } else if ((tag === "td" || tag === "th") && rowCells >= 0) {
      if (!close) {
        rowCells++;
        if (rowCells === 2) at()?.runs.push({ text: ": " });
        else if (rowCells > 2) at()?.runs.push({ text: " · " });
        if (rowCells === 1) bold++;
      } else if (rowCells === 1) bold--;
    } else if (tag === "p") {
      // A paragraph inside a list item or table row stays part of it.
      if (at()?.kind === "li" || rowCells >= 0) continue;
      if (close) flush();
      else start("p");
    }
  }
  flush();
  return blocks;
}

const s = StyleSheet.create({
  page: { fontFamily: "Text", fontSize: 10.5, lineHeight: 1.45, color: "#17213a", paddingTop: 48, paddingBottom: 56, paddingHorizontal: 54 },
  h1: { fontFamily: "Display", fontWeight: 700, fontSize: 22, lineHeight: 1.2, marginTop: 4, marginBottom: 4 },
  h2: { fontFamily: "Display", fontWeight: 700, fontSize: 14, lineHeight: 1.2, marginTop: 10, marginBottom: 3 },
  h3: { fontWeight: 700, fontSize: 11.5, marginTop: 8, marginBottom: 2 },
  p: { marginBottom: 5 },
  li: { flexDirection: "row", marginBottom: 3 },
  footer: { position: "absolute", bottom: 24, left: 54, right: 54, fontSize: 7.5, color: "#7a8399", flexDirection: "row", justifyContent: "space-between" },
});

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => {
        // Only upright faces are loaded, so italics show as regular text.
        const st = { fontWeight: r.bold ? 700 : 400 };
        return r.href ? (
          <Link key={i} src={r.href} style={{ ...st, color: "#2f5bb7" }}>
            {r.text}
          </Link>
        ) : (
          <Text key={i} style={st}>
            {r.text}
          </Text>
        );
      })}
    </>
  );
}

export async function wordResumeToPdf(buf: Buffer, title: string, brand: string) {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml(
    { buffer: buf },
    { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h3:fresh"], convertImage: mammoth.images.imgElement(async () => ({ src: "" })) });
  const blocks = htmlToBlocks(value.replace(/<img[^>]*>/gi, ""));
  registerFonts();
  const doc = (
    <Document title={title} author={brand}>
      <Page size="LETTER" style={s.page}>
        {blocks.map((b, i) =>
          b.kind === "li" ? (
            <View key={i} style={[s.li, { paddingLeft: (b.depth ?? 0) * 14 }]} wrap={false}>
              <Text style={{ width: 14 }}>{b.marker}</Text>
              <Text style={{ flex: 1 }}>
                <Runs runs={b.runs} />
              </Text>
            </View>
          ) : (
            <Text key={i} style={s[b.kind]} minPresenceAhead={b.kind === "p" ? 0 : 24}>
              <Runs runs={b.runs} />
            </Text>
          ),
        )}
        <View style={s.footer} fixed>
          <Text>{title}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
