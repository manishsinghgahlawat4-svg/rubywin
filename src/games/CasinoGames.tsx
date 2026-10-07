import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bell, Bomb, CircleDollarSign, CircleHelp, Compass, Crown, DoorOpen, Flower2, Flame, Gem, KeyRound, Leaf, Moon, Orbit, Shield, ShieldCheck, Sparkles, Star, Sun, Ticket } from "lucide-react";
import { Button, BetAmountPanel, Card, ResultBanner, Stat } from "../components/UI";
import { GameDef } from "../data";
import { useApp } from "../context/AppContext";
import { GameShell } from "./GameShell";
import { cn } from "../utils/cn";
import { freshRng, formatMoney } from "../utils/helpers";
import { gameSfx } from "../utils/audio";
import { gameArtwork } from "../components/GameArtwork";
import { IMG } from "../assets/images";

type GameResult = { win: boolean; amount: number; text?: string };

const SLOT_SYMBOLS: Record<string, string[]> = {
  classic: ["seven", "gem", "bell", "cherry", "star", "coin"],
  fruit: ["cherry", "sun", "orbit", "flower", "leaf", "gem"],
  diamond: ["gem", "shield", "orbit", "star", "crown", "spark"],
  lotus: ["flower", "leaf", "coin", "crown", "spark", "gem"],
  dragon: ["flame", "shield", "coin", "gem", "crown", "star"],
  royal: ["crown", "gem", "star", "shield", "coin", "spark"],
  treasure: ["coin", "key", "compass", "gem", "shield", "star"],
  neon: ["orbit", "spark", "music", "flame", "star", "gem"],
  candy: ["flower", "sun", "gem", "star", "bell", "coin"],
  space: ["moon", "orbit", "spark", "star", "shield", "sun"],
  jungle: ["leaf", "flower", "shield", "sun", "coin", "gem"],
  pirate: ["compass", "key", "shield", "coin", "gem", "star"],
  western: ["star", "sun", "shield", "leaf", "coin", "bell"],
  mystic: ["moon", "orbit", "shield", "spark", "star", "gem"],
  phoenix: ["flame", "sun", "shield", "star", "gem", "crown"],
  carnival: ["ticket", "star", "spark", "sun", "gem", "coin"],
};

const SYMBOL_ICONS = { gem: Gem, bell: Bell, cherry: Flower2, star: Star, coin: CircleDollarSign, sun: Sun, orbit: Orbit, flower: Flower2, leaf: Leaf, crown: Crown, spark: Sparkles, flame: Flame, shield: Shield, key: KeyRound, compass: Compass, moon: Moon, music: Sparkles, ticket: Ticket, seven: CircleDollarSign };
const SYMBOL_NAMES: Record<string, string> = { seven: "777", gem: "RUBY", bell: "BELL", cherry: "CHERRY", star: "STAR", coin: "COIN", sun: "SUN", orbit: "ORBIT", flower: "LOTUS", leaf: "JADE", crown: "CROWN", spark: "WILD", flame: "FIRE", shield: "WILD", key: "KEY", compass: "MAP", moon: "MOON", music: "NEON", ticket: "BONUS" };
const SlotSymbol: React.FC<{ symbol: string; compact?: boolean }> = ({ symbol, compact }) => {
  const Icon = SYMBOL_ICONS[symbol as keyof typeof SYMBOL_ICONS] ?? Sparkles;
  return <span className={cn("inline-flex flex-col items-center justify-center", compact ? "gap-0.5" : "gap-1")}><Icon size={compact ? 24 : 30} className="text-gold-300 drop-shadow-[0_2px_5px_rgba(0,0,0,.75)]" /><span className={cn("font-black tracking-[.12em] text-gold-100", compact ? "text-[7px]" : "text-[9px]")}>{SYMBOL_NAMES[symbol] ?? symbol.toUpperCase()}</span></span>;
};

const SLOT_RULES = [
  "Set a stake and spin three independent reels. The centre row is the winning line.",
  "Three matching symbols pay 8x, 14x or 25x depending on the symbol. Two matching symbols pay 1.5x.",
  "All outcomes use the local demo RNG. This is not a real-money slot machine or payment service.",
];

function useStake(game: GameDef) {
  const { state } = useApp();
  const limits = state.admin.gameControls[game.id] ?? { enabled: true, minBet: 1, maxBet: 100000 };
  const [amount, setAmount] = useState(Math.max(10, limits.minBet));
  return { amount, setAmount, limits };
}

/** Keeps a table "live": runs a visual-only demo round every `intervalMs` while the player is idle. */
function useIdleAutoplay(busy: boolean, run: () => void, intervalMs = 9000) {
  const { state } = useApp();
  const enabled = state.settings.autoPlay !== false;
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (busy || !enabled) return;
    const t = window.setTimeout(() => runRef.current(), intervalMs);
    return () => window.clearTimeout(t);
  }, [busy, intervalMs, enabled]);
}

const LiveBadge: React.FC<{ demo?: boolean }> = ({ demo }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 border border-white/15 px-2 py-0.5 text-[9px] font-black tracking-widest">
    <span className={cn("w-1.5 h-1.5 rounded-full", demo ? "bg-gold-300 animate-pulse" : "bg-emerald-400 animate-pulse")} /> {demo ? "MEGA WIN" : "LIVE TABLE"}
  </span>
);

const CenterIcon: React.FC<{ value: string; spinning?: boolean }> = ({ value, spinning }) => {
  const label = SYMBOL_NAMES[value] ?? value.toUpperCase();
  return (
    <div className={cn("slot-symbol h-24 rounded-xl bg-gradient-to-b from-[#fff4d2] via-[#f5d68a] to-[#b57b2a] text-night-950 flex flex-col items-center justify-center gap-1 shadow-[inset_0_2px_5px_rgba(255,255,255,.8),inset_0_-6px_0_rgba(75,40,4,.2),0_8px_18px_rgba(0,0,0,.4)] border border-gold-200/80", spinning && "slot-symbol-spinning")}>
      <span className={cn("flex items-center justify-center", spinning && "animate-pulse")}><SlotSymbol symbol={value} /></span>
      <span className="text-[9px] leading-none font-black tracking-[.12em]">{label}</span>
    </div>
  );
};

const SlotGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const symbols = SLOT_SYMBOLS[game.variant ?? "classic"] ?? SLOT_SYMBOLS.classic;
  const [reels, setReels] = useState([symbols[0], symbols[1], symbols[2]]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const betRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    if (betRef.current) settleBet(betRef.current, 0, "Spin interrupted");
  }, [settleBet]);

  const spin = () => {
    if (spinning) return;
    const id = placeBet({ game: game.id, selection: "center-line", selectionLabel: "3 reel centre line", amount });
    if (!id) return;
    betRef.current = id;
    setSpinning(true);
    setResult(null);
    gameSfx(game.id, "spin");
    const { rng } = freshRng(`slot:${game.id}`);
    const final = [0, 1, 2].map(() => symbols[Math.floor(rng() * symbols.length)]);
    timerRef.current = window.setInterval(() => setReels([0, 1, 2].map(() => symbols[Math.floor(Math.random() * symbols.length)])), 75);
    finishTimerRef.current = window.setTimeout(() => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      finishTimerRef.current = null;
      setReels(final);
      const matching = Math.max(...symbols.map((symbol) => final.filter((s) => s === symbol).length));
      const winningSymbol = symbols.find((symbol) => final.filter((s) => s === symbol).length === matching) ?? final[0];
      const symbolIndex = symbols.indexOf(winningSymbol);
      const multiple = matching === 3 ? (symbolIndex === 0 ? 25 : symbolIndex === 1 ? 14 : 8) : matching === 2 ? 1.5 : 0;
      const payout = Math.round(amount * multiple * 100) / 100;
      settleBet(id, payout, `${final.join(" ")} · ${multiple}x`);
      betRef.current = null;
      setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: `${final.join("  ")} · ${multiple}x payout` });
      setSpinning(false);
      gameSfx(game.id, payout > amount ? "win" : "lose");
      if (payout > amount) toast(`Jackpot line · ${formatMoney(payout)}`, "success");
    }, 1050);
  };

  return (
    <GameShell title={game.name} gameId={game.id} rules={SLOT_RULES}>
      <div className={cn("relative rounded-3xl p-4 border border-white/10 shadow-2xl overflow-hidden", game.gradient)}>
        <div className="absolute inset-0"><img src={gameArtwork(game)} alt="" className="h-full w-full object-cover opacity-35" /><div className="absolute inset-0 bg-gradient-to-b from-black/35 via-ruby-950/65 to-black/75" /></div>
        <div className="relative z-10 flex items-center justify-between mb-3"><div><span className="text-[9px] font-black tracking-[.22em] text-gold-200">RUBYWIN ORIGINAL</span><p className="text-sm font-black mt-1">{game.name}</p></div><span className="text-[10px] font-bold text-white/70">MEGA WIN REELS</span></div>
        <div className="relative z-10 grid grid-cols-3 gap-2 p-2 rounded-2xl bg-[#260b17]/80 border border-gold-200/30 shadow-[0_12px_30px_rgba(0,0,0,.55)]">
          {reels.map((symbol, i) => <CenterIcon key={i} value={symbol} spinning={spinning} />)}
          <div className="col-span-3 -mt-1 h-0.5 bg-gold-200 shadow-[0_0_14px_rgba(253,230,138,.9)]" />
        </div>
        <div className="relative z-10 flex items-center justify-center gap-2 mt-3 text-[10px] font-bold text-white/80"><Sparkles size={13} className="text-gold-300" /> 3 MATCH · UP TO 25X</div>
      </div>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><Stat label="Stake limits" value={`${formatMoney(limits.minBet, 0)} – ${formatMoney(limits.maxBet, 0)}`} /><Stat label="Max line prize" value={formatMoney(amount * 25)} valueClass="text-gold-400" /></div>
        <BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={spinning || !limits.enabled} />
        <Button block size="lg" variant="gold" onClick={spin} loading={spinning} disabled={!limits.enabled}>Spin · {formatMoney(amount)}</Button>
      </Card>
    </GameShell>
  );
};

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const RouletteGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const american = game.variant === "american";
  const pockets = useMemo(() => american ? ["0", "00", ...Array.from({ length: 36 }, (_, i) => String(i + 1))] : Array.from({ length: 37 }, (_, i) => String(i)), [american]);
  const [selection, setSelection] = useState("red");
  const [resultPocket, setResultPocket] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const spinTimer = useRef<number | null>(null);
  const betRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
    if (betRef.current) settleBet(betRef.current, 0, "Roulette spin interrupted");
  }, [settleBet]);

  const isRed = (p: string) => p !== "0" && p !== "00" && RED_NUMBERS.has(Number(p));
  const pocketColor = (p: string) => p === "0" || p === "00" ? "green" : isRed(p) ? "red" : "black";
  const [demoRound, setDemoRound] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const demoSpin = () => {
    if (spinning) return;
    const { rng } = freshRng(`roulette-demo:${game.id}`);
    const pocket = pockets[Math.floor(rng() * pockets.length)];
    const endIndex = pockets.indexOf(pocket);
    setDemoRound(true);
    setSpinning(true);
    setRotation((r) => r + 360 * 5 + ((pockets.length - endIndex) / pockets.length) * 360);
    spinTimer.current = window.setTimeout(() => {
      setResultPocket(pocket);
      setRecent((h) => [pocket, ...h].slice(0, 12));
      setSpinning(false);
      setDemoRound(false);
    }, 2700);
  };
  useIdleAutoplay(spinning, demoSpin, 8000);
  const spin = () => {
    if (spinning) return;
    const label = selection.startsWith("n") ? `Number ${selection.slice(1)}` : selection.charAt(0).toUpperCase() + selection.slice(1);
    const id = placeBet({ game: game.id, selection, selectionLabel: label, amount });
    if (!id) return;
    betRef.current = id;
    setSpinning(true);
    setResult(null);
    gameSfx(game.id, "spin");
    const { rng } = freshRng(`roulette:${game.id}`);
    const pocket = pockets[Math.floor(rng() * pockets.length)];
    const endIndex = pockets.indexOf(pocket);
    setRotation((r) => r + 360 * 7 + Math.random() * 120 + ((pockets.length - endIndex) / pockets.length) * 360);
    spinTimer.current = window.setTimeout(() => {
      const color = pocketColor(pocket);
      const n = pocket === "00" ? 37 : Number(pocket);
      const straight = selection.startsWith("n") && n === Number(selection.slice(1));
      const won = straight || (selection === "red" && color === "red") || (selection === "black" && color === "black") || (selection === "even" && n > 0 && n <= 36 && n % 2 === 0) || (selection === "odd" && n > 0 && n <= 36 && n % 2 === 1) || (selection === "low" && n >= 1 && n <= 18) || (selection === "high" && n >= 19 && n <= 36) || (selection.startsWith("dozen") && n > 0 && Math.ceil(n / 12) === Number(selection.slice(-1)));
      const multiplier = straight ? 36 : selection.startsWith("dozen") ? 3 : 2;
      const payout = won ? Math.round(amount * multiplier * 100) / 100 : 0;
      settleBet(id, payout, `${pocket} ${color} · ${won ? `${multiplier}x` : "miss"}`);
      betRef.current = null;
      setResultPocket(pocket);
      setRecent((h) => [pocket, ...h].slice(0, 12));
      setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: `${pocket} · ${color} · ${won ? `${multiplier}x payout` : "no payout"}` });
      setSpinning(false);
      gameSfx(game.id, won ? "win" : "lose");
      if (won) toast(`Roulette paid ${formatMoney(payout)}`, "success");
    }, 2700);
  };

  const choices = [
    { code: "red", label: "Red", color: "grad-red" }, { code: "black", label: "Black", color: "bg-slate-800 border border-white/20" },
    { code: "odd", label: "Odd", color: "bg-night-700 border border-white/10" }, { code: "even", label: "Even", color: "bg-night-700 border border-white/10" },
    { code: "low", label: "1–18", color: "bg-night-700 border border-white/10" }, { code: "high", label: "19–36", color: "bg-night-700 border border-white/10" },
    { code: "dozen1", label: "1st 12", color: "grad-violet" }, { code: "dozen2", label: "2nd 12", color: "grad-violet" }, { code: "dozen3", label: "3rd 12", color: "grad-violet" },
  ];
  const rouletteGradient = `conic-gradient(${pockets.map((p, i) => `${p === "0" || p === "00" ? "#047857" : isRed(p) ? "#b91c1c" : "#111827"} ${i * (360 / pockets.length)}deg ${(i + 1) * (360 / pockets.length)}deg`).join(",")})`;

  return (
    <GameShell title={game.name} gameId={game.id} rules={[`${american ? "American" : "European"} wheel: ${american ? "0, 00 and 1–36" : "0 and 1–36"}.`, "Pick a colour, parity, range, dozen or straight-up number before spinning.", "Straight-up number pays 36x, dozens 3x, outside bets 2x. Green pockets do not win red/black or parity bets."]}>
      <Card className="relative grad-dark flex flex-col items-center py-5 overflow-hidden">
        <img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-night-950/35 to-night-950/85" />
        <div className="relative z-10 mb-3 flex w-full items-center justify-between px-2"><LiveBadge demo={demoRound} /><span className="text-[10px] text-white/70">{american ? "00 + 0–36" : "0–36"}</span></div>
        {recent.length > 0 && <div className="relative z-10 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar w-full px-2">{recent.map((p, i) => <span key={`${p}-${i}`} className={cn("w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black border border-white/20", pocketColor(p) === "red" ? "bg-ruby-600" : pocketColor(p) === "black" ? "bg-slate-900" : "bg-emerald-600", i === 0 && "animate-pop")}>{p}</span>)}</div>}
        <div className="relative z-10 roulette-wheel-shell">
          <span className="roulette-pointer" />
          <div className="roulette-wheel" style={{ transform: `rotate(${rotation}deg)`, background: rouletteGradient }}>
            {pockets.map((p, i) => <span className="roulette-number" key={`${p}-${i}`} style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / pockets.length) + 360 / pockets.length / 2}deg) translateY(-91px) rotate(-${i * (360 / pockets.length) + 360 / pockets.length / 2}deg)` }}>{p}</span>)}
            <div className="roulette-hub"><span>{resultPocket ?? "RW"}</span></div>
          </div>
        </div>
        <div className="relative z-10 flex gap-2 mt-4 items-center text-xs text-white/80"><span className="w-3 h-3 rounded-full bg-ruby-600" /> Red <span className="w-3 h-3 rounded-full bg-slate-900 border border-white/30 ml-1" /> Black <span className="w-3 h-3 rounded-full bg-emerald-600 ml-1" /> Zero</div>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        <p className="text-xs font-bold text-white/65">Choose your bet · {selection.startsWith("n") ? "36x" : selection.startsWith("dozen") ? "3x" : "2x"}</p>
        <div className="grid grid-cols-3 gap-2">{choices.map((o) => <button key={o.code} onClick={() => setSelection(o.code)} className={cn("h-10 rounded-lg text-xs font-black border border-white/10 btn-press", o.color, selection === o.code && "ring-2 ring-gold-300")}>{o.label}</button>)}</div>
        <div className="grid grid-cols-7 gap-1">{pockets.filter((p) => p !== "00").map((p) => <button key={p} onClick={() => setSelection(`n${p}`)} className={cn("aspect-square rounded-md text-[10px] font-black btn-press", pocketColor(p) === "red" ? "bg-ruby-700" : pocketColor(p) === "black" ? "bg-slate-900 border border-white/10" : "bg-emerald-700", selection === `n${p}` && "ring-2 ring-gold-300")}>{p}</button>)}</div>
        {american && <button onClick={() => setSelection("n37")} className={cn("w-full h-8 rounded-md bg-emerald-700 text-xs font-bold", selection === "n37" && "ring-2 ring-gold-300")}>00 · Straight up 36x</button>}
        <BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={spinning} />
        <Button block size="lg" variant="primary" onClick={spin} loading={spinning} disabled={!limits.enabled}>Spin · {formatMoney(amount)}</Button>
      </Card>
    </GameShell>
  );
};

const CARD_OPTIONS: Record<string, { code: string; label: string }[]> = {
  baccarat: [{ code: "player", label: "Player · 2x" }, { code: "banker", label: "Banker · 1.95x" }, { code: "tie", label: "Tie · 8x" }],
  "teen-patti": [{ code: "trail", label: "Trail · 30x" }, { code: "sequence", label: "Sequence · 5x" }, { code: "pair", label: "Pair · 2x" }, { code: "color", label: "Color · 1.5x" }],
  "andar-bahar": [{ code: "andar", label: "Andar · 1.9x" }, { code: "bahar", label: "Bahar · 1.9x" }],
  "dragon-tiger": [{ code: "dragon", label: "Dragon · 1.96x" }, { code: "tiger", label: "Tiger · 1.96x" }, { code: "tie", label: "Tie · 11x" }],
  "casino-war": [{ code: "player", label: "Player · 2x" }, { code: "dealer", label: "Dealer · 2x" }, { code: "tie", label: "Tie · 11x" }],
  poker: [{ code: "pair", label: "Pair+ · 1.5x" }, { code: "two-pair", label: "Two pair+ · 3x" }, { code: "three", label: "Three of a kind+ · 5x" }, { code: "straight", label: "Straight · 10x" }],
};
const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS = ["♠", "♥", "♦", "♣"];
const cardCode = (value: number, suit = value % 4) => `${CARD_RANKS[(value - 1 + 13) % 13]}|${suit % 4}`;
const deckRank = (value: number) => ((value - 1) % 13) + 1;
const rankName = (r: number) => CARD_RANKS[(r - 1 + 13) % 13];
/** Blackjack hand value with soft aces (A = 11 unless that busts). */
const bjTotal = (hand: number[]) => {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    const r = deckRank(c);
    if (r === 1) { aces++; total += 11; } else total += Math.min(r, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};
const deckCode = (n: number): string => cardCode(deckRank(n), Math.floor((n - 1) / 13));

const CardFace: React.FC<{ code: string; index?: number }> = ({ code, index = 0 }) => {
  if (code === "back") {
    return <div className="playing-card card-back animate-card-deal" style={{ animationDelay: `${index * 90}ms` }}><img src={IMG.logo} alt="RubyWin" /><span>RUBYWIN</span></div>;
  }
  if (code.startsWith("side-")) {
    const side = code.slice(5);
    return <div className={cn("playing-card card-side animate-card-deal", side === "dragon" || side === "andar" ? "card-side-ruby" : "card-side-jade")} style={{ animationDelay: `${index * 90}ms` }}><span className="card-side-mark">{side === "dragon" ? "D" : side === "tiger" ? "T" : side === "andar" ? "A" : "B"}</span><span className="text-[10px] font-black tracking-[.18em]">{side.toUpperCase()}</span></div>;
  }
  const [rank = "A", suitIndex = "0"] = code.split("|");
  const suit = CARD_SUITS[Number(suitIndex) % 4];
  const red = suit === "♥" || suit === "♦";
  return (
    <div className={cn("playing-card card-face animate-card-deal", red ? "text-ruby-700" : "text-slate-950")} style={{ animationDelay: `${index * 90}ms` }}>
      <span className="card-corner card-corner-top"><b>{rank}</b><i>{suit}</i></span>
      <span className="card-center-suit">{suit}</span>
      <span className="card-corner card-corner-bottom"><b>{rank}</b><i>{suit}</i></span>
    </div>
  );
};

const CardsGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const options = CARD_OPTIONS[game.variant ?? "baccarat"] ?? CARD_OPTIONS.baccarat;
  const [selected, setSelected] = useState(options[0].code);
  const [cards, setCards] = useState<string[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [busy, setBusy] = useState(false);
  const isBlackjack = game.variant === "blackjack";
  const isDragonTiger = game.variant === "dragon-tiger";
  const blackjackRef = useRef<{ id: string; amount: number; deck: number[]; player: number[]; dealer: number[] } | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const pendingBetRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    if (demoTimerRef.current !== null) window.clearTimeout(demoTimerRef.current);
    if (pendingBetRef.current) settleBet(pendingBetRef.current, 0, "Game closed before card reveal");
    if (blackjackRef.current) settleBet(blackjackRef.current.id, 0, "Blackjack hand left before stand");
  }, [settleBet]);

  // ----- live table: visual-only demo deals while idle -----
  const [demoRound, setDemoRound] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const demoTimerRef = useRef<number | null>(null);
  const demoDeal = () => {
    if (busy || isBlackjack) return;
    const { rng } = freshRng(`cards-demo:${game.id}`);
    const r = () => 1 + Math.floor(rng() * 13);
    let reveal: string[] = [];
    let outcome = "";
    if (game.variant === "dragon-tiger") { const d = r(); const t = r(); reveal = [cardCode(d, 1), cardCode(t, 2)]; outcome = d === t ? "T" : d > t ? "D" : "Tg"; }
    else if (game.variant === "baccarat") { const p = Math.floor(rng() * 10); const b = Math.floor(rng() * 10); reveal = [cardCode(p || 10, 1), cardCode(b || 10, 2)]; outcome = p === b ? "T" : p > b ? "P" : "B"; }
    else if (game.variant === "andar-bahar") { const m = r(); const side = rng() < 0.5 ? "andar" : "bahar"; reveal = [cardCode(m, 1), `side-${side}`]; outcome = side === "andar" ? "A" : "B"; }
    else if (game.variant === "casino-war") { const p = r(); const d = r(); reveal = [cardCode(p, 0), cardCode(d, 3)]; outcome = p === d ? "T" : p > d ? "P" : "D"; }
    else if (game.variant === "teen-patti") { reveal = [r(), r(), r()].map((n, i) => cardCode(n, i)); outcome = "•"; }
    else { reveal = Array.from({ length: 5 }, r).map((n, i) => cardCode(n, (i + 1) % 4)); outcome = "•"; }
    setDemoRound(true);
    setBusy(true);
    setCards(reveal.map(() => "back"));
    gameSfx(game.id, "step");
    demoTimerRef.current = window.setTimeout(() => {
      setCards(reveal);
      setHistory((h) => [outcome, ...h].slice(0, 14));
      demoTimerRef.current = window.setTimeout(() => { setBusy(false); setDemoRound(false); }, 1800);
    }, 900);
  };
  useIdleAutoplay(busy, demoDeal, 7000);

  const finishBlackjack = (stand: boolean) => {
    const round = blackjackRef.current;
    if (!round) return;
    const player = [...round.player];
    const dealer = [...round.dealer];
    const p = bjTotal(player);
    if (stand && p <= 21) {
      while (bjTotal(dealer) < 17 && round.deck.length) dealer.push(round.deck.pop()!);
    }
    const d = bjTotal(dealer);
    const blackjack = player.length === 2 && p === 21;
    const payout = p > 21 ? 0 : blackjack ? Math.round(round.amount * 2.5 * 100) / 100 : d > 21 || p > d ? round.amount * 2 : p === d ? round.amount : 0;
    const note = p > 21 ? `Bust ${p}` : p === d ? `Push · ${p} vs ${d}` : `${p} vs dealer ${d}`;
    settleBet(round.id, payout, note);
    setCards([...player.map(deckCode), "·", ...dealer.map(deckCode)]);
    setResult({ win: payout > round.amount, amount: payout > 0 ? payout : round.amount, text: note });
    blackjackRef.current = null;
    setBusy(false);
    gameSfx(game.id, payout > round.amount ? "win" : "lose");
  };

  const dealBlackjack = () => {
    const id = placeBet({ game: game.id, selection: "blackjack", selectionLabel: "Blackjack · hand", amount });
    if (!id) return;
    const { rng } = freshRng("blackjack");
    const deck = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const player = [deck.pop()!, deck.pop()!];
    const dealer = [deck.pop()!, deck.pop()!];
    blackjackRef.current = { id, amount, deck, player, dealer };
    setCards([...player.map((n) => cardCode(deckRank(n), Math.floor((n - 1) / 13))), "·", cardCode(deckRank(dealer[0]), Math.floor((dealer[0] - 1) / 13)), "back"]);
    setResult(null);
    setBusy(true);
    gameSfx(game.id, "reveal");
    if (player.reduce((a, n) => a + Math.min(deckRank(n), 10), 0) >= 21) finishBlackjack(true);
  };

  const hit = () => {
    const round = blackjackRef.current;
    if (!round) return;
    round.player.push(round.deck.pop()!);
    setCards([...round.player.map(deckCode), "·", deckCode(round.dealer[0]), "back"]);
    gameSfx(game.id, "reveal");
    if (bjTotal(round.player) >= 21) finishBlackjack(true);
  };

  const play = () => {
    if (demoTimerRef.current !== null) { window.clearTimeout(demoTimerRef.current); demoTimerRef.current = null; setDemoRound(false); setBusy(false); }
    if (isBlackjack) return dealBlackjack();
    if (busy && !demoRound) return;
    const option = options.find((o) => o.code === selected) ?? options[0];
    const id = placeBet({ game: game.id, selection: selected, selectionLabel: `${game.name} · ${option.label.split(" · ")[0]}`, amount });
    if (!id) return;
    setBusy(true);
    setResult(null);
    gameSfx(game.id, "roll");
    const { rng } = freshRng(`cards:${game.id}`);
    let win = false;
    let multiplier = 0;
    let summary = "";
    let revealCards: string[] = ["back", "back"];
    // Real 52-card shoe: each dealt card has a consistent rank + suit
    const deck = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const draw = () => deck.pop()!;
    const suitOf = (n: number) => Math.floor((n - 1) / 13);
    const label = (n: number) => `${rankName(deckRank(n))}${CARD_SUITS[suitOf(n)]}`;
    // Ace high for comparison games
    const high = (n: number) => (deckRank(n) === 1 ? 14 : deckRank(n));
    if (game.variant === "baccarat") {
      const pv = (cs: number[]) => cs.reduce((a, c) => a + (deckRank(c) >= 10 ? 0 : deckRank(c)), 0) % 10;
      const pc = [draw(), draw()];
      const bc = [draw(), draw()];
      if (pv(pc) <= 5 && pv(bc) < 8) pc.push(draw());
      if (pv(bc) <= 5 && pv(pc) < 8) bc.push(draw());
      const p = pv(pc), b = pv(bc);
      const actual = p === b ? "tie" : p > b ? "player" : "banker";
      win = selected === actual;
      multiplier = selected === "tie" ? 8 : selected === "banker" ? 1.95 : 2;
      summary = `Player ${pc.map(label).join(" ")} = ${p} · Banker ${bc.map(label).join(" ")} = ${b} · ${actual.toUpperCase()}`;
      revealCards = [...pc.map(deckCode), "·", ...bc.map(deckCode)];
    } else if (game.variant === "teen-patti") {
      const hand = [draw(), draw(), draw()];
      const ranks = hand.map(high).sort((a, b) => a - b);
      const triple = ranks[0] === ranks[2];
      const pair = !triple && (ranks[0] === ranks[1] || ranks[1] === ranks[2]);
      const sequence = (ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1) || (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14);
      const color = hand.every((c) => suitOf(c) === suitOf(hand[0]));
      const actual = triple ? "trail" : sequence ? "sequence" : color ? "color" : pair ? "pair" : "high";
      win = actual === selected;
      multiplier = selected === "trail" ? 30 : selected === "sequence" ? 5 : selected === "pair" ? 2 : 1.5;
      summary = `${hand.map(label).join(" ")} · ${actual}`;
      revealCards = hand.map(deckCode);
    } else if (game.variant === "andar-bahar") {
      const joker = draw();
      let side: "andar" | "bahar" = "andar";
      let count = 0;
      for (;;) {
        const c = draw();
        count++;
        if (deckRank(c) === deckRank(joker)) break;
        side = side === "andar" ? "bahar" : "andar";
      }
      win = selected === side;
      multiplier = 1.9;
      summary = `Joker ${label(joker)} · match on card ${count} in ${side.toUpperCase()}`;
      revealCards = [deckCode(joker), `side-${side}`];
    } else if (game.variant === "dragon-tiger") {
      const dragon = draw();
      const tiger = draw();
      const dv = deckRank(dragon), tv = deckRank(tiger);
      const actual = dv === tv ? "tie" : dv > tv ? "dragon" : "tiger";
      win = selected === actual;
      multiplier = selected === "tie" ? 11 : 1.96;
      summary = `Dragon ${label(dragon)} · Tiger ${label(tiger)} · ${actual.toUpperCase()}`;
      revealCards = [deckCode(dragon), "·", deckCode(tiger)];
    } else if (game.variant === "casino-war") {
      const player = draw();
      const dealer = draw();
      const actual = high(player) === high(dealer) ? "tie" : high(player) > high(dealer) ? "player" : "dealer";
      win = selected === actual;
      multiplier = selected === "tie" ? 11 : 2;
      summary = `Player ${label(player)} · Dealer ${label(dealer)} · ${actual.toUpperCase()}`;
      revealCards = [deckCode(player), "·", deckCode(dealer)];
    } else {
      const hand = Array.from({ length: 5 }, draw);
      const ranks = hand.map(high).sort((a, b) => a - b);
      const counts = Object.values(ranks.reduce<Record<number, number>>((a, n) => ({ ...a, [n]: (a[n] ?? 0) + 1 }), {}));
      const maxCount = Math.max(...counts);
      const pairs = counts.filter((n) => n === 2).length;
      const unique = new Set(ranks).size === 5;
      const straight = unique && (ranks[4] - ranks[0] === 4 || ranks.join(",") === "2,3,4,5,14");
      const actual = straight ? "straight" : maxCount >= 3 ? "three" : pairs >= 2 ? "two-pair" : pairs === 1 ? "pair" : "none";
      const order = ["pair", "two-pair", "three", "straight"];
      win = order.indexOf(actual) >= 0 && order.indexOf(actual) >= order.indexOf(selected);
      multiplier = selected === "pair" ? 1.5 : selected === "two-pair" ? 3 : selected === "three" ? 5 : 10;
      summary = `${hand.map(label).join(" ")} · ${actual === "none" ? "high card" : actual}`;
      revealCards = hand.map(deckCode);
    }
    const payout = win ? Math.round(amount * multiplier * 100) / 100 : 0;
    pendingBetRef.current = id;
    setCards(revealCards.map((c) => (c === "·" ? "·" : "back")));
    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      pendingBetRef.current = null;
      setCards(revealCards);
      setHistory((h) => [win ? "W" : "L", ...h].slice(0, 14));
      settleBet(id, payout, summary);
      setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: summary });
      setBusy(false);
      gameSfx(game.id, payout > amount ? "win" : "lose");
      if (payout > amount) toast(`Hand paid ${formatMoney(payout)}`, "success");
    }, isDragonTiger ? 1150 : 760);
  };

  const text = game.variant === "blackjack" ? "Deal two cards, hit while your total is under 21, or stand to compare against the dealer." : "Choose a side or hand outcome and deal a fresh simulated round.";
  return (
    <GameShell title={game.name} gameId={game.id} rules={[text, "Card ranks and outcomes are generated locally for demo play.", "Payout values shown on each selection include the original stake."]}>
      <Card className={cn("relative min-h-[300px] overflow-hidden", isDragonTiger ? "bg-[#071e18]" : "bg-[#063d2e]")}>
        <div className="absolute inset-0 opacity-55"><img src={gameArtwork(game)} alt="" className={cn("h-full w-full object-cover", isDragonTiger && "dragon-tiger-art")} /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-emerald-950/55 to-black/85" />
        {isDragonTiger && <><div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-ruby-950/50 to-transparent" /><div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-emerald-950/45 to-transparent" /></>}
        <div className="relative z-10">
          <div className="flex items-center justify-between"><div><span className="text-[9px] font-black tracking-[.22em] text-gold-200">RUBYWIN TABLE</span><p className="text-base font-black mt-1">{game.name}</p></div><LiveBadge demo={demoRound} /></div>
          {history.length > 0 && <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">{history.map((h, i) => <span key={`${h}-${i}`} className={cn("w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black border border-white/20", h === "D" || h === "P" || h === "A" ? "bg-ruby-600" : h === "Tg" || h === "B" ? "bg-emerald-700" : h === "T" ? "bg-gold-500 text-night-950" : h === "W" ? "bg-emerald-500" : h === "L" ? "bg-slate-700" : "bg-white/10", i === 0 && "animate-pop")}>{h === "Tg" ? "T" : h}</span>)}</div>}
          {isDragonTiger && <div className="flex justify-between px-6 mt-5 text-[10px] font-black tracking-[.22em]"><span className="text-ruby-200">DRAGON</span><span className="text-emerald-200">TIGER</span></div>}
          <div className={cn("min-h-40 mt-3 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl bg-emerald-950/30 border border-gold-200/15 p-4", isDragonTiger && "bg-black/25 border-white/10")}>
            {(cards.length ? cards : isDragonTiger ? ["back", "·", "back"] : ["back", "back"]).map((c, i) => (c === "·" ? <span key={`sep-${i}`} className="text-[10px] font-black tracking-[.25em] text-gold-100/70 mx-1">VS</span> : <CardFace key={`${c}-${i}`} code={c} index={i} />))}
          </div>
          {isBlackjack && busy && blackjackRef.current && <p className="text-center text-xs font-bold mt-2 text-gold-100">Your hand: {bjTotal(blackjackRef.current.player)}</p>}
        </div>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        {!isBlackjack ? <div className="grid grid-cols-2 gap-2">{options.map((o) => <button key={o.code} onClick={() => setSelected(o.code)} className={cn("min-h-11 rounded-xl px-2 py-2 text-xs font-black border btn-press", selected === o.code ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/70")}>{o.label}</button>)}</div> : <div className="flex items-center gap-2 text-xs text-white/60"><ShieldCheck size={15} className="text-emerald-400" /> Blackjack pays 2x · natural 21 pays 2.5x · push returns stake.</div>}
        <BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={busy && !demoRound} />
        {isBlackjack && busy && !demoRound ? <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={hit}>Hit <ArrowUp size={15} /></Button><Button variant="gold" onClick={() => finishBlackjack(true)}>Stand <ArrowDown size={15} /></Button></div> : <Button block size="lg" variant="green" onClick={play} disabled={(busy && !demoRound) || !limits.enabled}>{isBlackjack ? `Deal hand · ${formatMoney(amount)}` : `Deal · ${formatMoney(amount)}`}</Button>}
      </Card>
    </GameShell>
  );
};

const TABLE_OPTIONS: Record<string, { code: string; label: string; payout: number }[]> = {
  sicbo: [{ code: "big", label: "Big · 2x", payout: 2 }, { code: "small", label: "Small · 2x", payout: 2 }, { code: "odd", label: "Odd · 2x", payout: 2 }, { code: "even", label: "Even · 2x", payout: 2 }, { code: "triple", label: "Triple · 30x", payout: 30 }],
  craps: [{ code: "pass", label: "Pass line · 2x", payout: 2 }, { code: "dont", label: "Don't pass · 2x", payout: 2 }, { code: "seven", label: "Lucky seven · 5x", payout: 5 }],
  coinflip: [{ code: "heads", label: "Heads · 1.95x", payout: 1.95 }, { code: "tails", label: "Tails · 1.95x", payout: 1.95 }],
  "red-black": [{ code: "red", label: "Red · 2x", payout: 2 }, { code: "black", label: "Black · 2x", payout: 2 }, { code: "green", label: "Green · 14x", payout: 14 }],
};

const DIE_PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const DiceTile: React.FC<{ value: number; rolling?: boolean }> = ({ value, rolling }) => <span className={cn("dice-photo-tile", rolling && "animate-shake")}>{Array.from({ length: 9 }).map((_, i) => <i key={i} className={DIE_PIPS[value]?.includes(i) ? "dice-pip-on" : ""} />)}</span>;

const ArcadeTableGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const options = TABLE_OPTIONS[game.variant ?? "coinflip"] ?? TABLE_OPTIONS.coinflip;
  const isDice = game.variant === "sicbo" || game.variant === "craps";
  const [pick, setPick] = useState(options[0].code);
  const [display, setDisplay] = useState<string[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const betRef = useRef<string | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); if (betRef.current) settleBet(betRef.current, 0, "Round interrupted"); }, [settleBet]);

  const roll = (rng: () => number) => {
    if (isDice) {
      const d = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
      return game.variant === "craps" ? d.slice(0, 2) : d;
    }
    return [];
  };
  const play = () => {
    if (busy) return;
    const option = options.find((o) => o.code === pick) ?? options[0];
    const id = placeBet({ game: game.id, selection: pick, selectionLabel: `${game.name} · ${option.label.split(" · ")[0]}`, amount });
    if (!id) return;
    betRef.current = id;
    setBusy(true);
    setResult(null);
    gameSfx(game.id, "roll");
    const { rng } = freshRng(`table:${game.id}`);
    let win = false;
    let text = "";
    let shown: string[] = [];
    if (isDice) {
      const d = roll(rng);
      const total = d.reduce((a, b) => a + b, 0);
      const triple = d.length === 3 && d[0] === d[1] && d[1] === d[2];
      shown = d.map(String);
      if (game.variant === "sicbo") win = pick === "triple" ? triple : !triple && (pick === "big" ? total >= 11 : pick === "small" ? total <= 10 : pick === "odd" ? total % 2 === 1 : total % 2 === 0);
      else win = pick === "seven" ? total === 7 : pick === "pass" ? [7, 11].includes(total) : [2, 3, 12].includes(total);
      text = `${d.join(" + ")} = ${total}${triple ? " · triple" : ""}`;
    } else {
      const val = rng();
      const actual = game.variant === "coinflip" ? (val < 0.5 ? "heads" : "tails") : val < 0.48 ? "red" : val < 0.96 ? "black" : "green";
      shown = [game.variant === "coinflip" ? (actual === "heads" ? "HEADS" : "TAILS") : actual.toUpperCase()];
      win = actual === pick;
      text = `Result: ${actual.toUpperCase()}`;
    }
    const payout = win ? Math.round(amount * option.payout * 100) / 100 : 0;
    const spin = window.setInterval(() => setDisplay(isDice ? roll(Math.random).map(String) : [Math.random() < 0.5 ? "…" : "•"]), 90);
    timer.current = window.setTimeout(() => {
      window.clearInterval(spin);
      setDisplay(shown);
      settleBet(id, payout, text);
      betRef.current = null;
      setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: `${text} · ${win ? `${option.payout}x` : "no payout"}` });
      setBusy(false);
      gameSfx(game.id, payout > amount ? "win" : "lose");
      if (payout > amount) toast(`You won ${formatMoney(payout)}`, "success");
    }, 900);
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={["Choose a side, roll or outcome, then reveal a fresh round.", "Every round uses a fresh seeded result; bet size does not affect the outcome.", "Payouts shown are total returns, including stake."]}>
      <Card className={cn("relative min-h-56 overflow-hidden flex flex-col items-center justify-center", game.gradient)}>
        <img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/30 to-black/70" />
        <div className="relative z-10 flex flex-col items-center"><span className="text-[9px] font-black tracking-[.22em] text-gold-100">{game.name.toUpperCase()} TABLE</span>
          <div className="flex items-center justify-center gap-3 mt-4 min-h-16">{(display.length ? display : isDice ? (game.variant === "craps" ? ["3", "4"] : ["1", "5", "3"]) : ["READY"]).map((d, i) => (isDice ? <DiceTile key={i} value={Number(d) || 1} rolling={busy} /> : <span key={i} className={cn("min-w-20 h-20 px-3 rounded-full border-2 border-gold-200/60 bg-gradient-to-br from-gold-300 to-amber-700 shadow-[0_8px_24px_rgba(0,0,0,.6)] flex items-center justify-center text-sm font-black text-night-950", busy ? "animate-spin" : "animate-pop", d === "RED" && "from-ruby-400 to-ruby-800 text-white", d === "BLACK" && "from-slate-500 to-night-950 text-white", d === "GREEN" && "from-emerald-400 to-emerald-800 text-white")}>{d}</span>))}</div>
        </div>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">{options.map((o) => <button key={o.code} onClick={() => setPick(o.code)} className={cn("min-h-11 px-2 rounded-xl border text-xs font-black btn-press", pick === o.code ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70")}>{o.label}</button>)}</div>
        <BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={busy} />
        <Button block size="lg" variant="gold" onClick={play} loading={busy} disabled={!limits.enabled}>Play · {formatMoney(amount)}</Button>
      </Card>
    </GameShell>
  );
};

const ScratchGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [busy, setBusy] = useState(false);
  const isTreasure = game.variant === "treasure";
  const prizeSymbols = isTreasure ? ["coin", "gem", "crown", "key", "compass", "spark", "ticket", "coin", "star"] : ["cherry", "gem", "star", "leaf", "crown", "coin", "ticket", "seven", "bell"];
  const [prizeSymbol, setPrizeSymbol] = useState<string | null>(null);
  const play = (cell: number) => {
    if (busy) return;
    const id = placeBet({ game: game.id, selection: `card-${cell + 1}`, selectionLabel: `${game.name} · card ${cell + 1}`, amount });
    if (!id) return;
    setBusy(true);
    setResult(null);
    gameSfx(game.id, "reveal");
    const { rng } = freshRng(`${game.id}:${cell}`);
    const roll = Math.floor(rng() * 100);
    const multiple = roll < 7 ? 10 : roll < 18 ? 4 : roll < 38 ? 2 : roll < 55 ? 1 : roll < 72 ? 0.5 : 0;
    const payout = Math.round(amount * multiple * 100) / 100;
    const symbol = prizeSymbols[Math.floor(rng() * prizeSymbols.length)];
    setRevealed(cell);
    setPrizeSymbol(symbol);
    const description = `${SYMBOL_NAMES[symbol]} · ${multiple}x return`;
    settleBet(id, payout, description);
    setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: description });
    setBusy(false);
    gameSfx(game.id, payout > amount ? "win" : "lose");
    if (payout > amount) toast(`Prize revealed · ${formatMoney(payout)}`, "success");
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={["Choose one sealed card to reveal its prize.", "Each card is a fresh independent draw returned as a multiplier of your stake.", "Prizes: 0x, 0.5x, 1x, 2x, 4x and 10x."]}>
      <Card className={cn("relative space-y-4 overflow-hidden", game.gradient)}><img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /><div className="absolute inset-0 bg-gradient-to-b from-black/35 to-black/80" /><div className="relative z-10 text-center"><span className="text-[9px] font-black tracking-[.22em] text-gold-100">RUBYWIN INSTANT REVEAL</span><p className="font-black text-lg mt-1">{isTreasure ? "Choose a treasure chest" : "Scratch to reveal"}</p><p className="text-xs text-white/70">Tap one card to play · up to 10x</p></div>
        <div className="relative z-10 grid grid-cols-3 gap-2">{Array.from({ length: 9 }).map((_, i) => <button key={i} disabled={busy || revealed !== null} onClick={() => play(i)} className={cn("aspect-square rounded-xl border border-gold-100/15 flex flex-col items-center justify-center gap-1 btn-press transition", revealed === i ? "bg-gradient-to-br from-amber-200 to-gold-600 text-night-950 animate-pop" : "bg-black/60 shadow-inner hover:bg-ruby-950/70")}>{revealed === i && prizeSymbol ? <SlotSymbol symbol={prizeSymbol} compact /> : <span className="font-black text-gold-100 text-xl">{String(i + 1).padStart(2, "0")}</span>}<span className="text-[8px] font-black tracking-widest">{revealed === i ? "REVEALED" : `CARD ${i + 1}`}</span></button>)}</div>
      </Card>
      <ResultBanner result={result} />
      {revealed !== null && <Button block variant="outline" onClick={() => { setRevealed(null); setResult(null); }}>Play another card</Button>}
      <Card><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={busy} /><p className="text-[10px] text-white/40 mt-2">Stake: {formatMoney(amount)}</p></Card>
    </GameShell>
  );
};

const NumberDrawGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const [picks, setPicks] = useState<number[]>([]);
  const [draw, setDraw] = useState<number[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [busy, setBusy] = useState(false);
  const isBingo = game.variant === "bingo";
  const pay = [0, 0, 0.5, 1, 4, 15];
  const play = () => {
    if (picks.length !== 5) return toast("Pick exactly 5 numbers", "error");
    const id = placeBet({ game: game.id, selection: picks.join(","), selectionLabel: `${game.name} · ${picks.length} picks`, amount });
    if (!id) return;
    setBusy(true);
    setResult(null);
    gameSfx(game.id, "roll");
    const { rng } = freshRng(game.id);
    const pool = Array.from({ length: 20 }, (_, i) => i + 1);
    const count = isBingo ? 10 : 8;
    const drawn: number[] = [];
    while (drawn.length < count) drawn.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    setDraw(drawn);
    const hits = picks.filter((n) => drawn.includes(n)).length;
    const multiplier = pay[Math.min(hits, pay.length - 1)];
    const payout = Math.round(amount * multiplier * 100) / 100;
    const text = `${hits}/5 matched · ${multiplier}x return`;
    settleBet(id, payout, `${drawn.join(", ")} · ${text}`);
    setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text });
    setBusy(false);
    gameSfx(game.id, payout > amount ? "win" : "lose");
    if (payout > amount) toast(`Draw paid ${formatMoney(payout)}`, "success");
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={[`Pick 5 numbers from 1 to 20. ${isBingo ? "10" : "8"} numbers are drawn.`, "The payout depends on how many picked numbers match. Five hits pay 15x."]}>
      <Card className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-black">Pick five numbers</p><span className="text-xs text-white/50">{picks.length}/5</span></div><div className="grid grid-cols-5 gap-2">{Array.from({ length: 20 }, (_, i) => i + 1).map((n) => { const picked = picks.includes(n); const drawn = draw.includes(n); return <button key={n} onClick={() => { if (busy) return; setResult(null); setDraw([]); setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 5 ? [...p, n] : p)); }} className={cn("aspect-square rounded-lg text-sm font-black border btn-press", picked && drawn ? "grad-gold text-night-950" : picked ? "grad-violet border-transparent" : drawn ? "bg-emerald-600 border-emerald-300 animate-pop" : "bg-white/5 border-white/10")}>{n}</button>; })}</div><div className="text-[10px] text-white/50">Drawn: {draw.length ? draw.join(" · ") : "—"}</div></Card>
      <ResultBanner result={result} />
      <Card className="space-y-3"><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={busy} /><Button block size="lg" variant="primary" onClick={play} disabled={busy || picks.length !== 5 || !limits.enabled}>Draw · {formatMoney(amount)}</Button></Card>
    </GameShell>
  );
};

const WheelArcade: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const prizes = game.variant === "mega-wheel" ? [0, 0, 0.2, 0.5, 1, 1.5, 2, 5, 12, 0, 0.5, 3] : [0, 0.5, 1, 1.2, 1.5, 2, 3, 5, 0, 1, 2, 10];
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const timer = useRef<number | null>(null);
  const betRef = useRef<string | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); if (betRef.current) settleBet(betRef.current, 0, "Wheel interrupted"); }, [settleBet]);
  const seg = 360 / prizes.length;
  const spin = () => {
    if (spinning) return;
    const id = placeBet({ game: game.id, selection: "spin", selectionLabel: `${game.name} spin`, amount });
    if (!id) return;
    betRef.current = id;
    setSpinning(true);
    setResult(null);
    gameSfx(game.id, "spin");
    const { rng } = freshRng(game.id);
    const idx = Math.floor(rng() * prizes.length);
    const value = prizes[idx];
    setRotation((r) => Math.ceil(r / 360) * 360 + 360 * 6 + (360 - (idx * seg + seg / 2)));
    timer.current = window.setTimeout(() => {
      const payout = Math.round(amount * value * 100) / 100;
      settleBet(id, payout, `Wheel landed on ${value}x`);
      betRef.current = null;
      setLast(value);
      setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: `Wheel stopped on ${value}x` });
      setSpinning(false);
      gameSfx(game.id, payout > amount ? "win" : "lose");
      if (payout > amount) toast(`Wheel prize ${formatMoney(payout)}`, "success");
    }, 2300);
  };
  const conic = `conic-gradient(${prizes.map((pz, i) => `${pz >= 5 ? "#f59e0b" : pz >= 2 ? "#e11d48" : pz > 0 ? "#059669" : "#1f2937"} ${i * seg}deg ${(i + 1) * seg}deg`).join(",")})`;
  return (
    <GameShell title={game.name} gameId={game.id} rules={["Place a stake then spin the prize wheel.", "The pointer stops on a multiplier; 0x loses, other values return stake × multiplier."]}>
      <Card className="flex flex-col items-center py-6 overflow-hidden"><div className="relative w-64 h-64"><span className="absolute z-10 top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-gold-200" /><div className="relative w-full h-full rounded-full border-[8px] border-gold-400 shadow-2xl transition-transform duration-[2300ms] ease-out" style={{ background: conic, transform: `rotate(${rotation}deg)` }}>{prizes.map((pz, i) => <span key={i} className="absolute left-1/2 top-1/2 text-[10px] font-black text-white drop-shadow" style={{ transform: `translate(-50%, -50%) rotate(${i * seg + seg / 2}deg) translateY(-100px)` }}>{pz}x</span>)}</div><span className="absolute inset-0 m-auto w-16 h-16 rounded-full grad-gold text-night-950 flex items-center justify-center text-sm font-black border-4 border-night-900">{last === null ? "SPIN" : `${last}x`}</span></div><p className="text-xs text-white/55 mt-3">{prizes.length} segments · max {Math.max(...prizes)}x</p></Card>
      <ResultBanner result={result} />
      <Card className="space-y-3"><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={spinning} /><Button block size="lg" variant="gold" onClick={spin} loading={spinning} disabled={!limits.enabled}>Spin · {formatMoney(amount)}</Button></Card>
    </GameShell>
  );
};

const BalloonGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const [active, setActive] = useState(false);
  const [pumps, setPumps] = useState(0);
  const [popAt, setPopAt] = useState(99);
  const [result, setResult] = useState<GameResult | null>(null);
  const idRef = useRef<string | null>(null);
  const mult = Number(Math.pow(1.32, pumps).toFixed(2));
  useEffect(() => () => { if (idRef.current) settleBet(idRef.current, 0, "Balloon game left"); }, [settleBet]);
  const start = () => {
    const id = placeBet({ game: game.id, selection: "inflate", selectionLabel: "Balloon Pop", amount });
    if (!id) return;
    const { rng } = freshRng(game.id);
    idRef.current = id;
    setPopAt(1 + Math.floor(rng() * 7));
    setPumps(0);
    setResult(null);
    setActive(true);
    gameSfx(game.id, "bet");
  };
  const pump = () => {
    if (!active) return;
    const n = pumps + 1;
    if (n >= popAt) {
      if (idRef.current) settleBet(idRef.current, 0, `Balloon popped on pump ${n}`);
      idRef.current = null;
      setActive(false);
      setPumps(n);
      setResult({ win: false, amount, text: `Pop! Balloon burst on pump ${n}` });
      gameSfx(game.id, "crash");
      return;
    }
    setPumps(n);
    gameSfx(game.id, "step");
  };
  const cashout = () => {
    if (!active || pumps === 0) return;
    const payout = Math.round(amount * mult * 100) / 100;
    if (idRef.current) settleBet(idRef.current, payout, `Cashed out at ${mult}x`);
    idRef.current = null;
    setActive(false);
    setResult({ win: payout > amount, amount: payout, text: `Cashed out after ${pumps} pumps at ${mult}x` });
    gameSfx(game.id, "cashout");
    toast(`Balloon cashout ${formatMoney(payout)}`, "success");
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={["Pump the balloon to increase the multiplier.", "Every pump risks popping it. Cash out to collect your current multiplier."]}>
      <Card className="relative flex flex-col items-center justify-center min-h-64 overflow-hidden"><img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /><div className="absolute inset-0 bg-gradient-to-b from-ruby-950/20 to-ruby-950/85" /><div className="relative z-10 flex flex-col items-center"><div className={cn("real-balloon", active && "balloon-float", !active && pumps >= popAt && "animate-shake")} style={{ transform: `scale(${1 + pumps * 0.12})` }}><span className="balloon-shine" /></div><p className="text-3xl font-black mt-5 drop-shadow">{mult}x</p><p className="text-xs font-bold mt-1 text-white/80">{active ? `${pumps} pumps · cash out before it pops` : "Build your multiplier"}</p></div></Card>
      <ResultBanner result={result} />
      <Card className="space-y-3"><div className="grid grid-cols-2 gap-2"><Stat label="Multiplier" value={`${mult}x`} valueClass="text-gold-400" /><Stat label="Potential return" value={formatMoney(amount * mult)} valueClass="text-emerald-400" /></div>{active ? <div className="grid grid-cols-2 gap-2"><Button variant="primary" size="lg" onClick={pump}>Pump balloon</Button><Button variant="gold" size="lg" disabled={pumps === 0} onClick={cashout}>Cash out</Button></div> : <><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} /><Button block size="lg" onClick={start} disabled={!limits.enabled}>Start · {formatMoney(amount)}</Button></>}</Card>
    </GameShell>
  );
};

const TowerGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [safeDoor, setSafeDoor] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const idRef = useRef<string | null>(null);
  const rngRef = useRef<() => number>(() => Math.random());
  const mult = Number(Math.pow(1.8, level).toFixed(2));
  useEffect(() => () => { if (idRef.current) settleBet(idRef.current, 0, "Tower game left"); }, [settleBet]);
  const start = () => {
    const id = placeBet({ game: game.id, selection: "tower", selectionLabel: "Tower climb", amount });
    if (!id) return;
    const { rng } = freshRng(game.id);
    rngRef.current = rng;
    idRef.current = id;
    setSafeDoor(Math.floor(rng() * 3));
    setLevel(0);
    setResult(null);
    setActive(true);
    gameSfx(game.id, "bet");
  };
  const finish = (payout: number, note: string) => {
    if (idRef.current) settleBet(idRef.current, payout, note);
    idRef.current = null;
    setActive(false);
    setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: note });
    gameSfx(game.id, payout > amount ? "win" : "lose");
  };
  const pickDoor = (door: number) => {
    if (door !== safeDoor) return finish(0, `Wrong door at level ${level + 1}`);
    const next = level + 1;
    setLevel(next);
    setSafeDoor(Math.floor(rngRef.current() * 3));
    gameSfx(game.id, "step");
    if (next === 8) finish(Math.round(amount * Math.pow(1.8, next) * 100) / 100, "Reached the summit!");
  };
  const cashout = () => {
    if (!active || level === 0) return;
    const payout = Math.round(amount * mult * 100) / 100;
    finish(payout, `Cashed out at level ${level} · ${mult}x`);
    toast(`Tower cashout ${formatMoney(payout)}`, "success");
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={["Pick one of three doors at every floor. Only one door is safe.", "Each safe floor multiplies by 1.8x. Cash out any time after the first floor."]}>
      <Card className={cn("relative space-y-3 overflow-hidden", game.gradient)}><img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /><div className="absolute inset-0 bg-gradient-to-b from-black/30 to-night-950/80" /><div className="relative z-10 flex items-end justify-center gap-2 h-48">{Array.from({ length: 8 }).map((_, i) => <div key={i} className={cn("w-7 rounded-t-md transition-all", i < level ? "grad-gold" : "bg-black/25")} style={{ height: `${38 + i * 17}px` }} />)}</div><p className="relative z-10 text-center font-black text-xl">Floor {level} · {mult}x</p>{active && <div className="relative z-10 grid grid-cols-3 gap-2">{[0, 1, 2].map((d) => <button key={d} onClick={() => pickDoor(d)} className="h-16 rounded-xl bg-black/50 border border-gold-200/20 flex items-center justify-center text-gold-100 btn-press animate-pop"><DoorOpen size={25} /></button>)}</div>}</Card>
      <ResultBanner result={result} />
      <Card className="space-y-3"><div className="grid grid-cols-2 gap-2"><Stat label="Floor multiplier" value={`${mult}x`} valueClass="text-gold-400" /><Stat label="Cashout" value={formatMoney(amount * mult)} valueClass="text-emerald-400" /></div>{active ? <Button block size="lg" variant="gold" onClick={cashout} disabled={level === 0}>Cash out {formatMoney(amount * mult)}</Button> : <><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} /><Button block size="lg" onClick={start} disabled={!limits.enabled}>Climb · {formatMoney(amount)}</Button></>}</Card>
    </GameShell>
  );
};

const MinesDeluxe: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const [active, setActive] = useState(false);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [all, setAll] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const idRef = useRef<string | null>(null);
  const multFor = (k: number) => { let m = 1; for (let i = 0; i < k; i++) m *= (16 - i) / (13 - i); return Math.floor(m * 0.96 * 100) / 100; };
  const mult = open.size ? multFor(open.size) : 1;
  useEffect(() => () => { if (idRef.current) settleBet(idRef.current, 0, "Mines Deluxe left"); }, [settleBet]);
  const start = () => {
    const id = placeBet({ game: game.id, selection: "gem-grid", selectionLabel: "Mines Deluxe · 3 mines", amount });
    if (!id) return;
    const { rng } = freshRng(game.id);
    const set = new Set<number>();
    while (set.size < 3) set.add(Math.floor(rng() * 16));
    idRef.current = id;
    setMines(set);
    setOpen(new Set());
    setAll(false);
    setResult(null);
    setActive(true);
    gameSfx(game.id, "bet");
  };
  const finish = (payout: number, note: string) => {
    if (idRef.current) settleBet(idRef.current, payout, note);
    idRef.current = null;
    setActive(false);
    setAll(true);
    setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: note });
    gameSfx(game.id, payout > amount ? "win" : "crash");
  };
  const reveal = (i: number) => {
    if (!active || open.has(i)) return;
    if (mines.has(i)) return finish(0, `Mine found after ${open.size} gems`);
    const next = new Set(open);
    next.add(i);
    setOpen(next);
    gameSfx(game.id, "reveal");
    if (next.size === 13) finish(Math.round(amount * multFor(13) * 100) / 100, "All safe tiles revealed!");
  };
  const cashout = () => {
    const payout = Math.round(amount * mult * 100) / 100;
    finish(payout, `Cashed out at ${mult.toFixed(2)}x`);
    toast(`Mines cashout ${formatMoney(payout)}`, "success");
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={["A 4×4 grid hides 3 mines. Reveal safe gems to increase the multiplier.", "Cash out any time, or lose the stake if you uncover a mine."]}>
      <Card className="relative p-3 overflow-hidden"><img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" /><div className="relative z-10 grid grid-cols-4 gap-2">{Array.from({ length: 16 }).map((_, i) => { const revealed = open.has(i) || all; const bomb = mines.has(i); return <button key={i} onClick={() => reveal(i)} disabled={!active || open.has(i)} className={cn("aspect-square rounded-xl border flex items-center justify-center btn-press", !revealed ? "bg-night-900/85 border-white/10 text-white/35" : bomb ? "bg-ruby-700/80 border-ruby-300 text-white" : "bg-emerald-800/80 border-emerald-300/70 text-emerald-100 animate-pop")}>{revealed ? bomb ? <Bomb size={23} /> : <Gem size={25} /> : <span className="text-[10px] font-black tracking-widest">OPEN</span>}</button>; })}</div></Card>
      <ResultBanner result={result} />
      <Card className="space-y-3"><div className="grid grid-cols-2 gap-2"><Stat label="Safe gems" value={open.size} /><Stat label="Multiplier" value={`${mult}x`} valueClass="text-gold-400" /></div>{active ? <Button block size="lg" variant="gold" onClick={cashout} disabled={!open.size}>Cash out {formatMoney(amount * mult)}</Button> : <><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} /><Button block size="lg" onClick={start} disabled={!limits.enabled}>Start · {formatMoney(amount)}</Button></>}</Card>
    </GameShell>
  );
};

const PlinkoPro: React.FC<{ game: GameDef }> = ({ game }) => {
  const { placeBet, settleBet, toast } = useApp();
  const { amount, setAmount, limits } = useStake(game);
  const [path, setPath] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const multipliers = [12, 4, 1.6, 0.7, 0.25, 0.7, 1.6, 4, 12];
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const play = () => {
    if (busy) return;
    const id = placeBet({ game: game.id, selection: "drop", selectionLabel: "Plinko Pro · drop", amount });
    if (!id) return;
    const { rng } = freshRng(game.id);
    const binary: number[] = Array.from({ length: 8 }, () => (rng() < 0.5 ? 0 : 1));
    const destination = binary.reduce((a, b) => a + b, 0);
    setPath([]);
    setResult(null);
    setLanded(null);
    setBusy(true);
    gameSfx(game.id, "roll");
    binary.forEach((dir, i) => timers.current.push(window.setTimeout(() => {
      setPath((pp) => [...pp, dir]);
      gameSfx(game.id, "step");
      if (i === binary.length - 1) {
        const multiple = multipliers[destination];
        const payout = Math.round(amount * multiple * 100) / 100;
        settleBet(id, payout, `Bin ${destination + 1} · ${multiple}x`);
        setLanded(destination);
        setResult({ win: payout > amount, amount: payout > 0 ? payout : amount, text: `Bin ${destination + 1} · ${multiple}x return` });
        setBusy(false);
        gameSfx(game.id, payout > amount ? "win" : "lose");
        if (payout > amount) toast(`Plinko prize ${formatMoney(payout)}`, "success");
      }
    }, 145 * (i + 1))));
  };
  return (
    <GameShell title={game.name} gameId={game.id} rules={["Drop a ball through eight rows of pegs.", "The final bin multiplier ranges from 0.25x to 12x."]}>
      <Card className="relative space-y-3 overflow-hidden"><img src={gameArtwork(game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" /><div className="relative z-10"><p className="text-center text-sm font-bold">Follow the bouncing ball</p><div className="grid grid-cols-8 gap-2 justify-items-center min-h-56">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex flex-col gap-2 items-center pt-1" style={{ paddingTop: `${i * 5}px` }}>{Array.from({ length: i + 1 }).map((__, j) => <span key={j} className={cn("w-2 h-2 rounded-full", path.length > i ? "bg-gold-300 shadow-[0_0_8px_#fbbf24]" : "bg-white/30")} />)}</div>)}<div className="col-span-8 min-h-9 flex items-center justify-center">{busy || landed !== null ? <span className={cn("plinko-ball", busy && "plinko-ball-bounce")} /> : null}</div></div><div className="grid grid-cols-9 gap-1">{multipliers.map((m, i) => <span key={i} className={cn("rounded-md text-[9px] font-black text-center py-1", i === landed ? "grad-gold text-night-950" : m >= 4 ? "bg-ruby-700" : m >= 1 ? "bg-emerald-800" : "bg-slate-700")}>{m}x</span>)}</div></div></Card>
      <ResultBanner result={result} />
      <Card className="space-y-3"><BetAmountPanel amount={amount} onChange={setAmount} min={limits.minBet} max={limits.maxBet} disabled={busy} /><Button block size="lg" variant="violet" onClick={play} loading={busy} disabled={!limits.enabled}>Drop ball · {formatMoney(amount)}</Button></Card>
    </GameShell>
  );
};

const GenericArcade: React.FC<{ game: GameDef }> = ({ game }) => {
  if (game.variant === "scratch" || game.variant === "treasure") return <ScratchGame game={game} />;
  if (game.variant === "bingo" || game.variant === "keno") return <NumberDrawGame game={game} />;
  if (game.variant === "wheel" || game.variant === "mega-wheel") return <WheelArcade game={game} />;
  if (game.variant === "balloon") return <BalloonGame game={game} />;
  if (game.variant === "tower") return <TowerGame game={game} />;
  if (game.variant === "mines-deluxe") return <MinesDeluxe game={game} />;
  if (game.variant === "plinko-pro") return <PlinkoPro game={game} />;
  return <ArcadeTableGame game={game} />;
};

export const CasinoGame: React.FC<{ game: GameDef }> = ({ game }) => {
  const { state } = useApp();
  const limits = state.admin.gameControls[game.id] ?? { enabled: true, minBet: 1, maxBet: 100000 };
  if (!limits.enabled) {
    return <GameShell title={game.name} gameId={game.id} rules={["This game has been paused by the administrator."]}><Card className="text-center py-12"><CircleHelp size={36} className="mx-auto text-gold-400" /><p className="font-black mt-3">Game temporarily unavailable</p><p className="text-xs text-white/50 mt-1">Please try another game.</p></Card></GameShell>;
  }
  if (game.mode === "slot") return <SlotGame game={game} />;
  if (game.mode === "roulette") return <RouletteGame game={game} />;
  if (game.mode === "cards") return <CardsGame game={game} />;
  return <GenericArcade game={game} />;
};