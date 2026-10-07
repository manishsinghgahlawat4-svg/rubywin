import React, { useCallback, useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Card, PageHeader, Tabs } from "../../components/UI";
import { cn } from "../../utils/cn";
import { BetSheet, CountdownOverlay, LotteryWalletCard, MyBetsList, Pager, PendingSelection, ResultPopup, TimerCard, useHistoryPeriods, useRound, useRoundSettlement } from "./LotteryShared";
import { LotteryGame, WinGoColor, trxResult, wingoResult } from "./engine";
import { sfx } from "../../utils/audio";

const ballClass = (c: WinGoColor) => (c === "red" ? "ball-red" : c === "green" ? "ball-green" : c === "red-violet" ? "ball-red-violet" : "ball-green-violet");

const RULES = [
  "A new round starts every 30s / 1 min / 3 min / 5 min. Betting closes 5 seconds before the draw.",
  "Numbers 1,3,7,9 are Green · 2,4,6,8 are Red · 0 is Red+Violet · 5 is Green+Violet.",
  "Green/Red pays 2x (1.5x when the result is 0 or 5). Violet pays 4.5x. Exact number pays 9x.",
  "Big = 5,6,7,8,9 · Small = 0,1,2,3,4 · both pay 2x.",
  "Results are derived from a deterministic seeded RNG per period and cannot be altered.",
];

export const ColorLottery: React.FC<{ game: Extract<LotteryGame, "wingo" | "trx"> }> = ({ game }) => {
  const { state } = useApp();
  const [duration, setDuration] = useState(game === "trx" ? 60 : 30);
  const { round, endedPeriod, locked } = useRound(duration, game);
  const [selection, setSelection] = useState<PendingSelection | null>(null);
  const [tab, setTab] = useState("history");
  const [page, setPage] = useState(0);
  const gameName = game === "wingo" ? "Win Go" : "Trx Win";
  const resolver = game === "wingo" ? wingoResult : trxResult;

  const resultText = useCallback(
    (p: string) => {
      const r = resolver(p, duration);
      return `${r.number} · ${r.size.toUpperCase()} · ${r.color.replace("-", "+")}`;
    },
    [resolver, duration]
  );
  const { popup, closePopup } = useRoundSettlement(game, duration, endedPeriod, resultText);

  const history = useHistoryPeriods(duration, round, 10, page);
  const chartRows = useHistoryPeriods(duration, round, 20, 0);
  const latest = useHistoryPeriods(duration, round, 1, 0);
  const pendingCount = state.bets.filter((b) => b.game === game && b.period === round.periodId && b.duration === duration).length;

  const pick = (code: string, label: string, theme: string) => {
    if (locked) {
      sfx.error();
      return;
    }
    sfx.click();
    setSelection({ code, label, theme });
  };

  const lastResult = useMemo(() => resolver(latest[0]?.periodId ?? round.periodId, duration), [resolver, latest, round.periodId, duration]);

  return (
    <div className="safe-bottom">
      <PageHeader title={gameName} showBalance />
      <div className="px-3 pt-3 space-y-4">
        <LotteryWalletCard rulesTitle={`${gameName} rules`} rules={game === "trx" ? [...RULES, "Trx Win result = the last numeric digit of the simulated TRON block hash for the period."] : RULES} />
        <TimerCard gameName={gameName} duration={duration} onDuration={(d) => { setDuration(d); setPage(0); }} round={round}>
          <div className="flex items-center gap-1 mt-1">
            {game === "trx" ? (
              <span className="text-[10px] text-white/50 font-mono">Block #{lastResult && "block" in lastResult ? (lastResult as { block: number }).block : ""}</span>
            ) : (
              <>
                <span className="text-[10px] text-white/50 mr-1">Last:</span>
                <span className={cn("ball w-5 h-5 text-[10px]", ballClass(lastResult.color))}>{lastResult.number}</span>
              </>
            )}
            {pendingCount > 0 && <span className="ml-2 text-[10px] font-bold text-gold-400">{pendingCount} bet(s) this round</span>}
          </div>
        </TimerCard>

        {/* Betting panel */}
        <Card className="relative space-y-4">
          <CountdownOverlay round={round} locked={locked} />
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => pick("green", "Green", "grad-green")} className="h-11 rounded-tl-xl rounded-br-xl grad-green font-black btn-press shadow-lg shadow-emerald-600/30">
              Green <span className="text-[10px] font-semibold opacity-80">2x</span>
            </button>
            <button onClick={() => pick("violet", "Violet", "grad-violet")} className="h-11 rounded-xl grad-violet font-black btn-press shadow-lg shadow-violet-600/30">
              Violet <span className="text-[10px] font-semibold opacity-80">4.5x</span>
            </button>
            <button onClick={() => pick("red", "Red", "grad-red")} className="h-11 rounded-tr-xl rounded-bl-xl grad-red font-black btn-press shadow-lg shadow-ruby-600/30">
              Red <span className="text-[10px] font-semibold opacity-80">2x</span>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3 bg-black/25 rounded-xl p-3">
            {Array.from({ length: 10 }).map((_, n) => {
              const c = n === 0 ? "red-violet" : n === 5 ? "green-violet" : n % 2 === 0 ? "red" : "green";
              const theme = c === "red" ? "grad-red" : c === "green" ? "grad-green" : "grad-violet";
              return (
                <button key={n} onClick={() => pick(`n${n}`, `Number ${n}`, theme)} className={cn("ball w-12 h-12 mx-auto text-lg btn-press shadow-lg", ballClass(c))}>
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const n = Math.floor(Math.random() * 10);
                pick(`n${n}`, `Number ${n}`, n === 0 || n === 5 ? "grad-violet" : n % 2 === 0 ? "grad-red" : "grad-green");
              }}
              className="flex items-center gap-1 px-3 h-9 rounded-lg border border-ruby-500 text-ruby-400 text-xs font-bold btn-press"
            >
              <Shuffle size={14} /> Random
            </button>
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
              {[1, 5, 10, 20, 50, 100].map((m) => (
                <span key={m} className="px-2.5 h-9 rounded-lg bg-white/5 text-[11px] font-bold text-white/60 flex items-center whitespace-nowrap">
                  X{m}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-0 rounded-full overflow-hidden">
            <button onClick={() => pick("big", "Big", "grad-gold")} className="h-11 grad-gold text-night-950 font-black btn-press">
              Big <span className="text-[10px] font-semibold opacity-80">2x</span>
            </button>
            <button onClick={() => pick("small", "Small", "grad-blue")} className="h-11 grad-blue font-black btn-press">
              Small <span className="text-[10px] font-semibold opacity-80">2x</span>
            </button>
          </div>
        </Card>

        {/* History tabs */}
        <Tabs tabs={[{ id: "history", label: "Game history" }, { id: "chart", label: "Chart" }, { id: "mine", label: "My history" }]} active={tab} onChange={(t) => { setTab(t); setPage(0); }} />

        {tab === "history" && (
          <Card className="p-0 overflow-hidden">
            <div className={cn("grid text-[11px] font-bold text-white/60 px-3 py-2.5 grad-red", game === "trx" ? "grid-cols-5" : "grid-cols-4")}>
              <span className="col-span-2 text-white">Period</span>
              <span className="text-center text-white">Number</span>
              {game === "trx" && <span className="text-center text-white">Hash</span>}
              <span className="text-center text-white">Size/Color</span>
            </div>
            <div className="divide-y divide-white/5">
              {history.map((h) => {
                const r = resolver(h.periodId, duration);
                return (
                  <div key={h.periodId} className={cn("grid items-center px-3 py-2.5", game === "trx" ? "grid-cols-5" : "grid-cols-4")}>
                    <span className="col-span-2 text-xs font-mono text-white/80">{h.periodId}</span>
                    <span className="flex justify-center">
                      <span className={cn("text-2xl font-black", r.color.startsWith("red") ? "text-ruby-400" : "text-emerald-400")}>{r.number}</span>
                    </span>
                    {game === "trx" && "hash" in r && <span className="text-center text-[10px] font-mono text-white/50">…{(r as { hash: string }).hash.slice(-5)}</span>}
                    <span className="flex items-center justify-center gap-1">
                      <span className="text-[11px] font-bold text-white/80">{r.size === "big" ? "Big" : "Small"}</span>
                      <span className={cn("w-3 h-3 rounded-full", r.color === "red" ? "bg-ruby-500" : r.color === "green" ? "bg-emerald-500" : "")} style={r.color.includes("violet") ? { background: `linear-gradient(135deg, ${r.color.startsWith("red") ? "#e11d48" : "#059669"} 50%, #7c3aed 50%)` } : undefined} />
                    </span>
                  </div>
                );
              })}
            </div>
            <Pager page={page} setPage={setPage} />
          </Card>
        )}

        {tab === "chart" && (
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-[1.4fr_2.6fr_0.8fr] text-[11px] font-bold px-3 py-2.5 grad-red">
              <span>Period</span>
              <span className="text-center">Number trend</span>
              <span className="text-center">B/S</span>
            </div>
            <div className="relative">
              <svg className="absolute left-0 top-0 pointer-events-none" width="100%" height={chartRows.length * 40} viewBox={`0 0 430 ${chartRows.length * 40}`} preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  points={chartRows.map((h, i) => `${150 + resolver(h.periodId, duration).number * 19.5 + 10},${i * 40 + 20}`).join(" ")}
                />
              </svg>
              <div className="divide-y divide-white/5">
                {chartRows.map((h) => {
                  const r = resolver(h.periodId, duration);
                  return (
                    <div key={h.periodId} className="grid grid-cols-[1.4fr_2.6fr_0.8fr] items-center px-3 h-10">
                      <span className="text-[10px] font-mono text-white/60">{h.periodId.slice(-6)}</span>
                      <div className="flex justify-between">
                        {Array.from({ length: 10 }).map((_, n) => (
                          <span key={n} className={cn("w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold", n === r.number ? ballClass(r.color) + " ball shadow" : "border border-white/15 text-white/30")}>
                            {n}
                          </span>
                        ))}
                      </div>
                      <span className={cn("text-center text-xs font-black", r.size === "big" ? "text-gold-400" : "text-sky-400")}>{r.size === "big" ? "B" : "S"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {tab === "mine" && (
          <Card>
            <MyBetsList game={game} duration={duration} />
          </Card>
        )}
      </div>

      <BetSheet game={game} selection={selection} period={round.periodId} duration={duration} onClose={() => setSelection(null)} />
      <ResultPopup data={popup} onClose={closePopup} gameName={gameName} />
    </div>
  );
};

export const WinGo: React.FC = () => <ColorLottery game="wingo" />;
export const TrxWin: React.FC = () => <ColorLottery game="trx" />;
