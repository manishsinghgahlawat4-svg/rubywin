import React from "react";
import { GameDef } from "../data";
import { cn } from "../utils/cn";
import { useApp } from "../context/AppContext";
import { IMG, img } from "../assets/images";

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=600`;

/** Every game gets its own artwork. Remote photos fall back to a bundled image if they fail to load. */
const ASSETS: Record<string, { src: string; fallback: string }> = {
  wingo: { src: px(7403771), fallback: IMG.roulette },
  trx: { src: px(15020123), fallback: IMG.slotNeon },
  k3: { src: px(11827675), fallback: IMG.diceTable },
  "5d": { src: px(37598251), fallback: IMG.slotLotus },
  skyrush: { src: px(31237491), fallback: IMG.poster },
  mines: { src: IMG.mines, fallback: IMG.mines },
  dice: { src: IMG.diceTable, fallback: IMG.diceTable },
  plinko: { src: px(17089481), fallback: IMG.slotNeon },
  limbo: { src: px(14019773), fallback: IMG.poster },
  keno: { src: px(34942775), fallback: IMG.slotJungle },
  hilo: { src: px(7471612), fallback: IMG.cardsTable },
  goal: { src: px(16826135), fallback: IMG.slotJungle },
  wheel: { src: IMG.roulette, fallback: IMG.roulette },
  "slot-classic": { src: IMG.slotClassic, fallback: IMG.slotClassic },
  "roulette-eu": { src: IMG.roulette, fallback: IMG.roulette },
  "roulette-american": { src: px(30056706), fallback: IMG.roulette },
  baccarat: { src: IMG.cardsTable, fallback: IMG.cardsTable },
  blackjack: { src: px(36776646), fallback: IMG.cardsTable },
  "teen-patti": { src: px(34346368), fallback: IMG.cardsTable },
  "andar-bahar": { src: px(38405901), fallback: IMG.cardsTable },
  "dragon-tiger": { src: IMG.dragonTiger, fallback: IMG.dragonTiger },
  "casino-war": { src: px(1679602), fallback: IMG.cardsTable },
  "poker-draw": { src: px(18341166), fallback: IMG.cardsTable },
  "sic-bo": { src: px(11827675), fallback: IMG.diceTable },
  craps: { src: px(30056706), fallback: IMG.diceTable },
  coinflip: { src: px(8830897), fallback: IMG.slotClassic },
  "red-black": { src: IMG.roulette, fallback: IMG.roulette },
  "scratch-cards": { src: px(7080498), fallback: IMG.slotClassic },
  "balloon-pop": { src: px(6629584), fallback: IMG.slotNeon },
  "tower-climb": { src: px(17089481), fallback: IMG.slotLotus },
  "lucky-wheel": { src: IMG.slotLotus, fallback: IMG.slotLotus },
  "mega-wheel": { src: IMG.slotNeon, fallback: IMG.slotNeon },
  "bingo-90": { src: px(29393719), fallback: IMG.slotJungle },
  "keno-speed": { src: px(37598251), fallback: IMG.slotNeon },
  "treasure-dig": { src: px(7080480), fallback: IMG.slotClassic },
  "mines-deluxe": { src: IMG.slotJungle, fallback: IMG.slotJungle },
  "plinko-pro": { src: px(14019773), fallback: IMG.slotNeon },
};

const entry = (gameOrId: GameDef | string) => ASSETS[typeof gameOrId === "string" ? gameOrId : gameOrId.id] ?? { src: IMG.poster, fallback: IMG.poster };

/** Always-available bundled artwork (used for in-game backdrops and thumbnails). */
export function gameArtwork(gameOrId: GameDef | string): string {
  const e = entry(gameOrId);
  return e.src.startsWith("http") ? e.fallback : e.src;
}

/** <img> that swaps to a bundled fallback if the source fails. */
export const SafeImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement> & { fallback?: string }> = ({ src, fallback = IMG.poster, ...rest }) => (
  <img
    {...rest}
    src={img(src as string, fallback)}
    onError={(e) => {
      const el = e.currentTarget;
      if (el.dataset.fallback !== "1") {
        el.dataset.fallback = "1";
        el.src = fallback;
      }
    }}
  />
);

export const GameImg: React.FC<{ game: GameDef | string; className?: string }> = ({ game, className }) => {
  const e = entry(game);
  return <SafeImg src={e.src} fallback={e.fallback} alt="" className={className} loading="lazy" />;
};

export const GameArtwork: React.FC<{ game: GameDef; className?: string; imageClassName?: string }> = ({ game, className, imageClassName }) => (
  <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden="true">
    <GameImg game={game} className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105", imageClassName)} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/5" />
    <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-transparent" />
  </div>
);

export const BrandMark: React.FC<{ className?: string; alt?: string }> = ({ className, alt = "RubyWin" }) => {
  const { state } = useApp();
  return <SafeImg src={img(state.admin.logoUrl, IMG.logo)} fallback={IMG.logo} alt={alt} className={cn("h-9 w-9 object-contain", className)} />;
};
