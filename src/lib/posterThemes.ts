// The three poster colors the team can pick from (job posters and candidate teasers).
const NAVY = "#17213a";
const GOLD = "#f2b300";
export const POSTER_THEMES = {
  navy: { bg: NAVY, grad: "radial-gradient(circle at 0% 30%, #2a3660 0%, rgba(42,54,96,0) 55%)", ink: "#ffffff", soft: "#c9d0e0", accent: GOLD, card: "rgba(255,255,255,0.08)", cardLine: "rgba(255,255,255,0.18)", pillBg: GOLD, pillInk: NAVY, band: GOLD, bandInk: NAVY, top: GOLD, topInk: NAVY },
  gold: { bg: GOLD, grad: "radial-gradient(circle at 100% 0%, #ffd34d 0%, rgba(255,211,77,0) 60%)", ink: NAVY, soft: "#5c4a12", accent: NAVY, card: "rgba(255,255,255,0.55)", cardLine: "rgba(23,33,58,0.15)", pillBg: NAVY, pillInk: GOLD, band: NAVY, bandInk: "#ffffff", top: NAVY, topInk: GOLD },
  light: { bg: "#f6f3ea", grad: "radial-gradient(circle at 0% 0%, #fff8dc 0%, rgba(255,248,220,0) 60%)", ink: NAVY, soft: "#5d6579", accent: "#c28f00", card: "#ffffff", cardLine: "#e6e1d2", pillBg: NAVY, pillInk: "#ffffff", band: NAVY, bandInk: "#ffffff", top: GOLD, topInk: NAVY },
} as const;
export type PosterTheme = keyof typeof POSTER_THEMES;
export const posterTheme = (v: string | null) => POSTER_THEMES[(v ?? "") in POSTER_THEMES ? (v as PosterTheme) : "navy"];
