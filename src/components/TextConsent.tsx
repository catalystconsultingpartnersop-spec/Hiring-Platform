import Link from "next/link";

// The box people tick to get texts. Never ticked for them. The wording is what
// the phone carriers ask for, kept as short as they allow, and shown once:
// someone who already agreed just sees the tick box.
export function TextConsent({
  name = "text_ok",
  checked,
  onChange,
  defaultChecked,
  dark,
  agreed,
}: {
  name?: string;
  checked?: boolean;
  onChange?: (on: boolean) => void;
  defaultChecked?: boolean;
  dark?: boolean;
  agreed?: boolean; // they already said yes once: no need to show the small print again
}) {
  const fine = { color: dark ? "rgba(255,255,255,.7)" : "var(--ink-2)", fontSize: 12, fontWeight: 400, lineHeight: 1.4, display: "block", marginTop: 2 } as const;
  const controlled = checked !== undefined;
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "12px 0 0", cursor: "pointer", textAlign: "left" }}>
      <input
        type="checkbox"
        name={name}
        value="yes"
        {...(controlled ? { checked, onChange: (ev: React.ChangeEvent<HTMLInputElement>) => onChange?.(ev.target.checked) } : { defaultChecked })}
        style={{ marginTop: 3, width: 18, height: 18, flex: "none" }}
      />
      <span style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.35 }}>
        <b>Text me updates</b> about my calls and introductions.
        {!agreed && (
        <span style={fine}>
          Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to stop, HELP for help.{" "}
          <Link href="/terms" target="_blank" style={{ color: "inherit" }}>
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" target="_blank" style={{ color: "inherit" }}>
            Privacy
          </Link>
        </span>
        )}
      </span>
    </label>
  );
}
