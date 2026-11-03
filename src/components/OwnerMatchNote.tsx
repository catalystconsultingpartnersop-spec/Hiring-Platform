import Link from "next/link";
import { ownerFits } from "@/lib/ownerMatches";
import { DismissNote } from "./DismissNote";

// A quiet note for owners who told us what they're hiring for: candidates who may fit.
export async function OwnerMatchNote({ ownerId }: { ownerId: string }) {
  const fits = await ownerFits(ownerId).catch(() => []);
  if (!fits.length) return null;
  const { p, list } = fits[0];
  const key = `fit:${p.id}:${list.map((x) => x.c.id).join(",")}`;
  return (
    <DismissNote id={key}>
      <div className="owner-fit">
        <p className="owner-fit-title">
          {list.length === 1 ? "1 candidate may fit" : `${list.length} candidates may fit`} your {p.title} opening
        </p>
        <p className="owner-fit-sub">Take a look when you have a minute.</p>
        <ul>
          {list.map(({ c, why }) => (
            <li key={c.id}>
              <Link href={`/candidates/${c.id}`}>{c.headline}</Link>
              {why && <span>Fits: {why}</span>}
            </li>
          ))}
        </ul>
      </div>
    </DismissNote>
  );
}
