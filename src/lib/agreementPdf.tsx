import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { agreementBlocks, formatSigned, SignatureInfo } from "./agreementView";
import { registerFonts } from "./invitePdf";

// The client's signed agreement as a PDF, attached to their "you can meet them" email.
const s = StyleSheet.create({
  page: { fontFamily: "Text", fontSize: 9.5, lineHeight: 1.5, color: "#17213a", paddingTop: 44, paddingBottom: 44, paddingHorizontal: 54 },
  title: { fontFamily: "Display", fontWeight: 800, fontSize: 17, lineHeight: 1.25, marginBottom: 4 },
  sub: { color: "#4a5570", marginBottom: 12 },
  h: { fontFamily: "Display", fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 3 },
  p: { marginBottom: 3 },
  item: { marginLeft: 16, marginBottom: 2 },
  sig: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: "#d5dae4", borderRadius: 6 },
  sigK: { fontSize: 8, color: "#4a5570", letterSpacing: 0.8, textTransform: "uppercase" },
  sigName: { fontFamily: "Display", fontWeight: 700, fontSize: 14, marginTop: 4 },
});

export async function agreementPdf(text: string, sig: SignatureInfo): Promise<Buffer> {
  registerFonts();
  const blocks = agreementBlocks(text);
  const doc = (
    <Document title="Signed agreement">
      <Page size="LETTER" style={s.page}>
        {blocks.map((b, i) =>
          b.kind === "title" ? (
            <Text key={i} style={s.title}>{b.text}</Text>
          ) : b.kind === "subtitle" ? (
            <Text key={i} style={s.sub}>{b.text}</Text>
          ) : b.kind === "heading" ? (
            <Text key={i} style={s.h}>{`${b.num}. ${b.text}`}</Text>
          ) : b.kind === "clause" ? (
            <Text key={i} style={s.p}>{`${b.num}  ${b.text}`}</Text>
          ) : b.kind === "item" ? (
            <Text key={i} style={s.item}>{`(${b.num})  ${b.text}`}</Text>
          ) : (
            <Text key={i} style={s.p}>{b.text}</Text>
          ),
        )}
        <View style={s.sig} wrap={false}>
          <Text style={s.sigK}>Signed electronically</Text>
          <Text style={s.sigName}>{sig.name}</Text>
          <Text>{`For ${sig.company}${sig.email ? `, ${sig.email}` : ""}`}</Text>
          <Text>{`${formatSigned(sig.signedAt)}${sig.ip ? `, from ${sig.ip}` : ""}`}</Text>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
