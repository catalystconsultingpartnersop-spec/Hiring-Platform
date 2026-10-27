import { agreementBlocks, formatSigned, SignatureInfo } from "@/lib/agreementView";
import styles from "./doc.module.css";

// The agreement, laid out like a real document.
export function AgreementDoc({ text, signature }: { text: string; signature?: SignatureInfo }) {
  return (
    <div className={styles.doc}>
      {agreementBlocks(text).map((b, i) => {
        switch (b.kind) {
          case "title":
            return (
              <h2 key={i} className={styles.title}>
                {b.text}
              </h2>
            );
          case "subtitle":
            return (
              <p key={i} className={styles.subtitle}>
                {b.text}
              </p>
            );
          case "heading":
            return (
              <h3 key={i} className={styles.heading}>
                <span className={styles.num}>{b.num}</span>
                {b.text}
              </h3>
            );
          case "clause":
            return (
              <p key={i} className={styles.clause}>
                <span className={styles.clauseNum}>{b.num}</span>
                <span>{b.text}</span>
              </p>
            );
          case "item":
            return (
              <p key={i} className={styles.item}>
                <span className={styles.clauseNum}>({b.num})</span>
                <span>{b.text}</span>
              </p>
            );
          default:
            return (
              <p key={i} className={styles.para}>
                {b.text}
              </p>
            );
        }
      })}
      {signature && (
        <div className={styles.signature}>
          <p className={styles.sigLabel}>Signed electronically</p>
          <p className={styles.sigName}>{signature.name}</p>
          <p className={styles.sigMeta}>
            For {signature.company}
            {signature.email ? `, ${signature.email}` : ""}
            <br />
            {formatSigned(signature.signedAt)}
            {signature.ip ? `, from ${signature.ip}` : ""}
            {signature.version ? ` · Version ${signature.version}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// The few things that matter, in plain words, above the full text.
export function KeyTerms({ items }: { items: [string, string][] }) {
  return (
    <dl className={styles.terms}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
