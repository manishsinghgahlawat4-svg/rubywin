import React, { useState } from "react";
import { BookOpen, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Card, Modal, PageHeader } from "../components/UI";
import { BetRow } from "./lottery/LotteryShared";

export const GameShell: React.FC<{ title: string; gameId: string; rules: string[]; children: React.ReactNode; hideRecent?: boolean }> = ({ title, gameId, rules, children, hideRecent }) => {
  const { state, navigate, isLoggedIn, setAutoPlay } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);
  const recent = state.bets.filter((b) => b.game === gameId).slice(0, 8);
  const auto = state.settings.autoPlay !== false;
  return (
    <div className="safe-bottom">
      <PageHeader
        title={title}
        showBalance={isLoggedIn}
        right={
          <>
            <button onClick={() => setAutoPlay(!auto)} className={`h-8 px-2.5 rounded-full text-[10px] font-black border transition ${auto ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300" : "bg-white/5 border-white/15 text-white/50"}`} aria-label="Toggle auto demo rounds">
              AUTO {auto ? "ON" : "OFF"}
            </button>
            <button onClick={() => setRulesOpen(true)} className="p-2 rounded-full hover:bg-white/10" aria-label="Rules">
              <BookOpen size={18} />
            </button>
          </>
        }
      />
      <div className="px-3 pt-3 space-y-4">
        {!isLoggedIn && (
          <Card className="border-gold-400/30 bg-gold-500/10 flex items-center gap-3">
            <UserRound size={22} className="text-gold-200 shrink-0" />
            <div className="flex-1"><p className="text-xs font-black text-gold-200">Log in or register to place bets</p><p className="text-[10px] text-white/55 mt-0.5">New players get a ₹30 welcome bonus instantly.</p></div>
            <Button size="sm" variant="gold" onClick={() => navigate("/login")}>Log in</Button>
          </Card>
        )}
        {children}
        <div className="flex items-center gap-2 text-[11px] text-white/45 px-1">
          <ShieldCheck size={14} className="text-emerald-400" /> Provably fair · seeded RNG · RTP 96–99%
        </div>
        {!hideRecent && (
          <Card>
            <h3 className="font-bold text-sm mb-3">Recent bets</h3>
            {recent.length === 0 ? <p className="text-center text-white/40 text-sm py-4">No bets yet</p> : <div className="space-y-2">{recent.map((b) => <BetRow key={b.id} bet={b} />)}</div>}
          </Card>
        )}
      </div>
      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title={`${title} rules`}>
        <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
          {rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};
