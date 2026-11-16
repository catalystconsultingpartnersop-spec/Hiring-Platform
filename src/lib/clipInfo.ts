// The light part of the clip code: what a clip record looks like and where its files live.
// Pages import this; the heavy clip maker (ffmpeg) lives in clips.ts and only the clip job loads it.

export const CLIP_BUCKET = "resumes";
export const clipPath = (id: string, kind: "video" | "photo" | "face") => `clips/${id}${kind === "video" ? ".mp4" : kind === "face" ? "-face.jpg" : ".jpg"}`;
// Bump when the way clips are picked changes: older ones are quietly made again.
export const CLIP_V = 2;
export type Clip = { at: string; start: number; face: boolean; v?: number };
export function clipOf(app: Record<string, string> | null | undefined): Clip | null {
  try {
    const c = JSON.parse(app?.clip ?? "null") as Clip | null;
    return c?.at && c.v === CLIP_V ? c : null;
  } catch {
    return null;
  }
}

