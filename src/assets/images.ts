// Relative paths work whether the site is hosted at the domain root or in a sub-folder.
// Resolve against the page URL (without hash) so it works from any folder.
const base = typeof window !== "undefined" ? window.location.pathname.replace(/[^/]*$/, "").replace(/admin\/?$/, "") : "/";
const p = (file: string) => `${base}images/${file}`;

export const IMG = {
  poster: p("rubywin-poster.png"),
  dragonTiger: p("game-dragon-tiger.jpg"),
  cardsTable: p("game-cards-table.jpg"),
  slotClassic: p("game-slot-classic.jpg"),
  slotLotus: p("game-slot-lotus.jpg"),
  slotJungle: p("game-slot-jungle.jpg"),
  slotNeon: p("game-slot-neon.jpg"),
  mines: p("game-mines.jpg"),
  roulette: p("game-roulette.jpg"),
  diceTable: p("game-dice-table.jpg"),
  logo: p("rubywin-logo.svg"),
};

/** Resolve any stored path (legacy "/images/..." or URL/data URI) to a working src. */
export function img(src: string | undefined | null, fallback: string = IMG.poster): string {
  if (!src) return fallback;
  if (src === "/images/rubywin-mark.svg") return IMG.logo;
  if (src.startsWith("/images/")) return p(src.slice("/images/".length));
  return src;
}
