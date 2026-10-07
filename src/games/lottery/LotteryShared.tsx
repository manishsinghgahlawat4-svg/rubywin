import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Clock, Headphones, Trophy, Wallet, XCircle } from "lucide-react";
import { useApp, BetRecord } from "../../context/AppContext";
import { Button, Card, Modal } from "../../components/UI";
import { cn } from "../../utils/cn";
import { RoundInfo, formatDateTime, formatMoney, getRound, previousPeriods } from "../../utils/helpers";
import { gameSfx, sfx } from "../../utils/audio";
import { DURATIONS, DURATION_LABELS, LotteryGame, calcLotteryPayout, selectionOdds } from "./engine";

// ---------- Round hook ----------
export function useRound(duration: number, soundId = "lottery") {
  const [round, setRound] = useState<RoundInfo>(() => getRound(duration));
  const [endedPeriod, setEndedPeriod] = useState<string | null>(null);
  const lastPeriodRef = useRef(round.periodId);
  const lastSecRef = useRef(-1);

  useEffect(() => {
    lastPeriodRef.current = getRound(duration).periodId;
    setRound(getRound(duration));
    const t = setInterval(() => {
      const r = getRound(duration);
      if (r.periodId !== lastPeriodRef.current) {
        setEndedPeriod(lastPeriodRef.current);
        lastPeriodRef.current = r.periodId;
      }
      const sec = Math.ceil(r.remainingMs / 1000);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        if (sec <= 5 && sec > 0) gameSfx(soundId, "step");
      }
      setRound(r);
    }, 200);
    return () => clearInterval(t);
  }, [duration, soundId]);

  return { round, endedPeriod, locked: round.remainingMs <= 5000 };
}

// ---------- Header wallet card ----------
export const LotteryWalletCard: React.FC<{ rulesTitle: string; rules: string[] }> = ({ rulesTitle, rules }) => {
  const { state, navigate } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <Card className="grad-ruby-card border-ruby-400/20">
      <div className="flex items-center gap-2 text-white/80 text-xs">
        <Wallet size={14} /> Wallet balance
      </div>
      <p className="text-3xl font-black tabular-nums mt-1">{formatMoney(state.user.balance)}</p>

      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="gold" className="flex-1" onClick={() => navigate("/deposit")}>
          Deposit
        </Button>
        <Button size="sm" variant="dark" className="flex-1 bg-black/30" onClick={() => navigate("/withdraw")}>
          Withdraw
        </Button>
        <Button size="sm" variant="dark" className="bg-black/30" onClick={() => setRulesOpen(true)}>
          <BookOpen size={14} /> Rules
        </Button>
        <Button size="sm" variant="dark" className="bg-black/30" onClick={() => navigate("/service")}>
          <Headphones size={14} />
        </Button>
      </div>
      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title={rulesTitle}>
        <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
          {rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Modal>
    </Card>
  );
};

// ---------- Timer card with duration tabs ----------
export const TimerCard: React.FC<{ gameName: string; duration: number; onDuration: (d: number) => void; round: RoundInfo; children?: React.ReactNode }> = ({
  gameName,
  duration,
  onDuration,
  round,
  children,
}) => {
  const secs = Math.max(0, Math.ceil(round.remainingMs / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => {
              sfx.click();
              onDuration(d);
            }}
            className={cn("rounded-xl py-2.5 flex flex-col items-center gap-1 border transition btn-press", duration === d ? "grad-red border-transparent shadow-lg shadow-ruby-600/30" : "bg-white/5 border-white/10 text-white/60")}
          >
            <Clock size={18} className={cn(duration === d ? "animate-tick" : "")} />
            <span className="text-[11px] font-bold leading-tight text-center">
              {gameName}
              <br />
              {DURATION_LABELS[d]}
            </span>
          </button>
        ))}
      </div>
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/50">Period</p>
          <p className="font-bold tabular-nums text-sm mt-0.5">{round.periodId}</p>
          {children}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-white/50">Time remaining</p>
          <div className="flex items-center gap-1 mt-1">
            {[mm[0], mm[1], ":", ss[0], ss[1]].map((c, i) =>
              c === ":" ? (
                <span key={i} className="font-black text-ruby-400 text-lg">
                  :
                </span>
              ) : (
                <span key={i} className={cn("w-7 h-9 rounded-md flex items-center justify-center font-black text-lg tabular-nums", secs <= 5 ? "bg-ruby-600 text-white animate-pulse" : "bg-black/40 text-gold-400")}>
                  {c}
                </span>
              )
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------- Countdown overlay ----------
export const CountdownOverlay: React.FC<{ round: RoundInfo; locked: boolean }> = ({ round, locked }) => {
  if (!locked) return null;
  const secs = Math.max(0, Math.ceil(round.remainingMs / 1000));
  const s = String(secs).padStart(2, "0");
  return (
    <div className="absolute inset-0 z-20 rounded-2xl bg-black/75 backdrop-blur-sm flex items-center justify-center gap-3">
      {s.split("").map((c, i) => (
        <span key={`${c}-${i}-${secs}`} className="w-20 h-28 rounded-2xl grad-red flex items-center justify-center text-6xl font-black animate-pop shadow-2xl">
          {c}
        </span>
      ))}
    </div>
  );
};

// ---------- Bet sheet ----------
export interface PendingSelection {
  code: string;
  label: string;
  theme: string; // css class
}

export const BetSheet: React.FC<{
  game: LotteryGame;
  selection: PendingSelection | null;
  period: string;
  duration: number;
  onClose: () => void;
}> = ({ game, selection, period, duration, onClose }) => {
  const { placeBet, toast } = useApp();
  const [unit, setUnit] = useState(10);
  const [qty, setQty] = useState(1);
  const [mult, setMult] = useState(1);
  const [agree, setAgree] = useState(true);
  const total = Math.round(unit * qty * mult * 100) / 100;
  useEffect(() => {
    if (selection) {
      setQty(1);
      setMult(1);
    }
  }, [selection]);
  if (!selection) return null;
  const odds = selectionOdds(game, selection.code);
  const confirm = () => {
    if (!agree) {
      toast("Please agree to the pre-sale rules", "error");
      return;
    }
    const id = placeBet({ game, selection: selection.code, selectionLabel: selection.label, amount: total, period, duration });
    if (id) {
      gameSfx(game, "bet");
      toast(`Bet placed: ${selection.label} · ${formatMoney(total)}`, "success");
      onClose();
    }
  };
  return (
    <Modal open={!!selection} onClose={onClose} hideClose className="p-0">
      <div className={cn("-m-4 mb-4 p-4 text-center", selection.theme)}>
        <p className="font-black text-lg">{game === "wingo" ? "Win Go" : game === "trx" ? "Trx Win" : game === "k3" ? "K3" : "5D"} · {DURATION_LABELS[duration]}</p>
        <p className="text-xs text-white/85 mt-0.5">
          Select <span className="font-bold">{selection.label}</span> · Odds {odds}x
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Balance</span>
          <div className="flex gap-1.5">
            {[1, 10, 100, 1000].map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border", unit === u ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70")}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Quantity</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white/10 font-bold">
              -
            </button>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))} className="w-16 h-8 rounded-lg bg-black/40 text-center font-bold outline-none" />
            <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-lg bg-white/10 font-bold">
              +
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {[1, 5, 10, 20, 50, 100].map((m) => (
            <button key={m} onClick={() => setMult(m)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border", mult === m ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70")}>
              X{m}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-ruby-500 w-4 h-4" />I agree to the <span className="text-ruby-400">《Pre-sale rules》</span>
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-[2]" onClick={confirm}>
            Total amount {formatMoney(total)}
          </Button>
        </div>
        <p className="text-[11px] text-white/40 text-center">Potential win: {formatMoney(total * odds)}</p>
      </div>
    </Modal>
  );
};

// ---------- Result popup ----------
export const ResultPopup: React.FC<{ data: { period: string; win: boolean; amount: number; resultText: string; selections: string } | null; onClose: () => void; gameName: string }> = ({ data, onClose, gameName }) => {
  if (!data) return null;
  return (
    <Modal open={!!data} onClose={onClose} sheet={false} hideClose className="bg-transparent border-0 shadow-none">
      <div className={cn("rounded-3xl p-6 text-center animate-pop border-2", data.win ? "bg-emerald-950 border-emerald-400" : "bg-night-800 border-ruby-500/60")}>
        {data.win ? <Trophy size={48} className="mx-auto text-gold-300" /> : <XCircle size={48} className="mx-auto text-ruby-300" />}
        <p className={cn("text-2xl font-black mt-2", data.win ? "text-emerald-300" : "text-white/80")}>{data.win ? "Congratulations!" : "Sorry"}</p>
        <p className="text-xs text-white/60 mt-1">
          {gameName} · Period {data.period}
        </p>
        <p className="text-sm text-white/80 mt-2">Result: {data.resultText}</p>
        <p className="text-xs text-white/50">Your pick: {data.selections}</p>
        <p className={cn("text-3xl font-black mt-3 tabular-nums", data.win ? "text-gold-300" : "text-ruby-400")}>
          {data.win ? "+" : "-"}
          {formatMoney(data.amount)}
        </p>
        <Button block className="mt-4" variant={data.win ? "green" : "primary"} onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

// ---------- Hook: settle finished period & create popup ----------
export function useRoundSettlement(game: LotteryGame, duration: number, endedPeriod: string | null, resultText: (period: string) => string) {
  const { state, settleBet } = useApp();
  const [popup, setPopup] = useState<{ period: string; win: boolean; amount: number; resultText: string; selections: string } | null>(null);
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!endedPeriod || handledRef.current === endedPeriod) return;
    handledRef.current = endedPeriod;
    const mine = state.bets.filter((b) => b.game === game && b.period === endedPeriod && b.duration === duration);
    if (!mine.length) return;
    let totalPayout = 0;
    let totalBet = 0;
    for (const b of mine) {
      const payout = calcLotteryPayout(game, b.selection, b.amount, endedPeriod, duration);
      totalPayout += payout;
      totalBet += b.amount;
      if (b.result === "pending") settleBet(b.id, payout);
      else totalPayout += 0;
    }
    const win = totalPayout > 0;
    gameSfx(game, win ? "win" : "lose");
    setPopup({ period: endedPeriod, win, amount: win ? totalPayout : totalBet, resultText: resultText(endedPeriod), selections: mine.map((b) => b.selectionLabel).join(", ") });
  }, [endedPeriod, game, duration, state.bets, settleBet, resultText]);
  return { popup, closePopup: () => setPopup(null) };
}

// ---------- History list helpers ----------
export function useHistoryPeriods(duration: number, round: RoundInfo, count = 10, page = 0) {
  return useMemo(() => previousPeriods(duration, (page + 1) * count, round.startTs + 1).slice(page * count), [duration, round.startTs, count, page]);
}

export const Pager: React.FC<{ page: number; setPage: (p: number) => void; hasNext?: boolean }> = ({ page, setPage, hasNext = true }) => (
  <div className="flex items-center justify-center gap-3 py-3">
    <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-bold disabled:opacity-30">
      ‹ Prev
    </button>
    <span className="text-xs text-white/60">Page {page + 1}</span>
    <button disabled={!hasNext} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-bold disabled:opacity-30">
      Next ›
    </button>
  </div>
);

export const MyBetsList: React.FC<{ game: LotteryGame; duration: number }> = ({ game, duration }) => {
  const { state } = useApp();
  const [page, setPage] = useState(0);
  const mine = state.bets.filter((b) => b.game === game && b.duration === duration);
  const slice = mine.slice(page * 10, page * 10 + 10);
  if (!mine.length) return <p className="text-center text-white/40 text-sm py-8">No bets yet. Place your first bet!</p>;
  return (
    <div>
      <div className="space-y-2">
        {slice.map((b) => (
          <BetRow key={b.id} bet={b} />
        ))}
      </div>
      <Pager page={page} setPage={setPage} hasNext={(page + 1) * 10 < mine.length} />
    </div>
  );
};

export const BetRow: React.FC<{ bet: BetRecord }> = ({ bet }) => (
  <div className="flex items-center gap-3 rounded-xl bg-black/25 border border-white/5 p-3">
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black text-center leading-tight", bet.result === "win" ? "grad-green" : bet.result === "lose" ? "bg-white/10 text-white/60" : "grad-gold text-night-950")}>
      {bet.result === "pending" ? "WAIT" : bet.result === "win" ? "WIN" : "LOSE"}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold truncate">{bet.selectionLabel}</p>
      <p className="text-[10px] text-white/45 truncate">
        {bet.period ? `${bet.period} · ` : ""}
        {formatDateTime(bet.createdAt)}
      </p>
      {bet.detail && <p className="text-[10px] text-white/45 truncate">{bet.detail}</p>}
    </div>
    <div className="text-right">
      <p className={cn("text-sm font-black tabular-nums", bet.result === "win" ? "text-emerald-400" : bet.result === "lose" ? "text-ruby-400" : "text-gold-400")}>
        {bet.result === "win" ? `+${formatMoney(bet.payout)}` : bet.result === "lose" ? `-${formatMoney(bet.amount)}` : formatMoney(bet.amount)}
      </p>
      <p className="text-[10px] text-white/40">Bet {formatMoney(bet.amount, 0)}</p>
    </div>
  </div>
);
