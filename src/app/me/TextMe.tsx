import { TextConsent } from "@/components/TextConsent";
import { saveMyTexts } from "./actions";

// A candidate turns texts on or off, and can fix their mobile number.
export function TextMe({ phone, on }: { phone: string | null; on: boolean }) {
  return (
    <form action={saveMyTexts} className="panel">
      <p style={{ fontWeight: 800, margin: "0 0 4px" }}>{on ? "You get updates by text" : "Get updates by text"}</p>
      <p className="small" style={{ margin: "0 0 10px" }}>When an employer wants to meet you or offers times, a text gets to you faster than email.</p>
      <label className="field" style={{ margin: 0 }}>
        <span>Mobile number</span>
        <input className="input" name="phone" type="tel" autoComplete="tel" defaultValue={phone ?? ""} required />
      </label>
      <TextConsent defaultChecked={on} />
      <button className="btn btn-gold btn-small" type="submit" style={{ marginTop: 12 }}>
        Save
      </button>
    </form>
  );
}
