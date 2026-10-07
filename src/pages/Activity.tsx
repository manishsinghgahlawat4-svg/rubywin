import React, { useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, CheckCircle2, CreditCard, Crown, Dice5, Gift, Percent, Plane, Sparkles, Target, Trophy, Wallet, Zap } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Card, EmptyState, PageHeader, SectionTitle, Stat } from "../components/UI";
import { ATTENDANCE_REWARDS, GAME_LABELS, GIFT_CODES, MISSIONS, getVipLevel } from "../data";
import { cn } from "../utils/cn";
import { formatDateTime, formatMoney, todayKey } from "../utils/helpers";
import { sfx } from "../utils/audio";

export const Activity: React.FC = () => {
  const { navigate, state, missionProgress, rebateAvailable } = useApp();
  const checkedToday = state.activity.lastCheckIn === todayKey();
  const missionsReady = MISSIONS.filter((m) => { const p = missionProgress(m); return p.done && !p.claimed; }).length;
  const rebate = rebateAvailable();
  const items = [
    { title: "Attendance bonus", desc: checkedToday ? `Day ${state.activity.streak} ✓ · come back tomorrow` : "Check in daily for up to ₹100", icon: <CalendarCheck size={22} />, route: "/attendance", cls: "grad-red", badge: checkedToday ? "" : "NEW" },
    { title: "Gift code", desc: "Redeem gift codes for free bonus", icon: <Gift size={22} />, route: "/gift", cls: "grad-gold", badge: state.activity.redeemedCodes.length === 0 ? "RUBYWIN" : "" },
    { title: "Daily missions", desc: `${missionsReady} reward(s) ready to claim`, icon: <Target size={22} />, route: "/missions", cls: "grad-violet", badge: missionsReady ? String(missionsReady) : "" },
    { title: "Betting rebate", desc: `${formatMoney(rebate)} available`, icon: <Percent size={22} />, route: "/rebate", cls: "grad-green", badge: rebate >= 1 ? "₹" : "" },
    { title: "Super Jackpot", desc: "Big wins hall of fame", icon: <Trophy size={22} />, route: "/jackpot", cls: "grad-blue", badge: "" },
    { title: "Invitation bonus", desc: "Invite friends & earn commission", icon: <Sparkles size={22} />, route: "/promotion", cls: "grad-red", badge: "" },
  ];
  return (
    <div className="safe-bottom">
      <PageHeader title="Activity" showBack={false} showBalance />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-ruby-card border-ruby-400/20 flex items-center justify-between">
          <div>
            <p className="font-black text-lg">Activity Center</p>
            <p className="text-xs text-white/75 mt-1">Please remember to follow the event page.<br />We will launch user feedback activities from time to time.</p>
          </div>
           <Gift size={48} className="text-gold-200 animate-float drop-shadow-[0_0_18px_rgba(253,230,138,.55)]" />
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {items.map((it) => (
            <button key={it.title} onClick={() => { sfx.click(); navigate(it.route); }} className="relative rounded-2xl grad-dark border border-white/5 card-shadow p-4 text-left btn-press">
              {it.badge && <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-ruby-500 animate-pulse">{it.badge}</span>}
              <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-lg", it.cls)}>{it.icon}</span>
              <p className="font-bold text-sm mt-3">{it.title}</p>
              <p className="text-[11px] text-white/50 mt-0.5 leading-tight">{it.desc}</p>
            </button>
          ))}
        </div>
        <div>
          <SectionTitle title="Ongoing events" />
          <div className="space-y-3">
            {[
              { t: "First deposit bonus up to 5%", d: "Deposit via UPI QR and receive an instant bonus on every deposit.", icon: <Wallet size={26} />, r: "/deposit", cls: "grad-gold" },
              { t: "Sky Rush weekly race", d: "Highest multiplier cash-out of the week wins ₹10,000.", icon: <Plane size={26} />, r: "/skyrush", cls: "grad-violet" },
              { t: "VIP level-up rewards", d: "Reach VIP 1 with ₹3,000 wagered and claim ₹60 instantly.", icon: <Crown size={26} />, r: "/vip", cls: "grad-red" },
            ].map((ev) => (
              <button key={ev.t} onClick={() => navigate(ev.r)} className={cn("w-full rounded-2xl p-4 text-left flex items-center justify-between card-shadow btn-press", ev.cls)}>
                <div><p className="font-black">{ev.t}</p><p className="text-xs text-white/85 mt-1">{ev.d}</p></div>
                <span className="shrink-0 ml-3 text-white/90">{ev.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Attendance: React.FC = () => {
  const { state, checkIn, toast } = useApp();
  const checkedToday = state.activity.lastCheckIn === todayKey();
  const streak = state.activity.streak;
  const doCheckIn = () => {
    const r = checkIn();
    if (r.ok) { sfx.bigWin(); toast(r.message, "success"); } else { sfx.error(); toast(r.message, "error"); }
  };
  const total = ATTENDANCE_REWARDS.reduce((a, b) => a + b, 0);
  return (
    <div className="safe-bottom">
      <PageHeader title="Attendance" />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-ruby-card border-ruby-400/20 text-center py-6">
          <p className="text-xs text-white/70">Consecutive check-in</p>
          <p className="text-5xl font-black mt-1">{streak}<span className="text-lg text-white/70"> / 7 days</span></p>
          <p className="text-xs text-white/70 mt-2">Total check-ins: {state.activity.totalCheckIns} · Earn up to {formatMoney(total, 0)} every week</p>
        </Card>
        <div className="grid grid-cols-4 gap-2">
          {ATTENDANCE_REWARDS.map((r, i) => {
            const day = i + 1;
            const done = day <= streak;
            const isNext = day === (checkedToday ? streak : streak + 1) && !done;
            return (
              <div key={day} className={cn("rounded-xl p-2 text-center border", i === 6 && "col-span-2", done ? "grad-gold text-night-950 border-transparent" : isNext ? "border-gold-400 bg-gold-500/10 animate-pulse" : "bg-white/5 border-white/10")}>
                <p className="text-[10px] font-bold opacity-80">Day {day}</p>
                <p className="flex items-center justify-center h-8">{done ? <CheckCircle2 size={23} /> : i === 6 ? <Gift size={23} /> : <span className="text-lg font-black">₹</span>}</p>
                <p className="text-xs font-black">₹{r}</p>
              </div>
            );
          })}
        </div>
        <Button block size="lg" variant={checkedToday ? "dark" : "gold"} disabled={checkedToday} onClick={doCheckIn}>
          {checkedToday ? "Checked in today ✓" : `Check in now · get ₹${ATTENDANCE_REWARDS[(state.activity.lastCheckIn === todayKey(new Date().setDate(new Date().getDate() - 1)) ? streak % 7 : 0)]}`}
        </Button>
        <Card>
          <h3 className="font-bold text-sm mb-2">Rules</h3>
          <ul className="text-xs text-white/60 space-y-1.5 list-disc pl-4">
            <li>Check in once per calendar day. Rewards increase each consecutive day (₹5 → ₹100).</li>
            <li>Missing a day resets the streak to day 1. After day 7 the cycle restarts.</li>
            <li>Rewards are credited to the main wallet instantly.</li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-bold text-sm mb-2">Check-in history</h3>
          {state.activity.checkInDays.length === 0 ? <EmptyState text="No check-ins yet" /> : (
            <div className="flex flex-wrap gap-1.5">
              {[...state.activity.checkInDays].reverse().map((d) => <span key={d} className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-bold">{d.slice(0, 4)}-{d.slice(4, 6)}-{d.slice(6)}</span>)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export const GiftPage: React.FC = () => {
  const { state, redeemGift, toast } = useApp();
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const submit = () => {
    const r = redeemGift(code);
    if (r.ok) { sfx.bigWin(); toast(r.message, "success"); setCode(""); } else { sfx.error(); setShake(true); setTimeout(() => setShake(false), 500); toast(r.message, "error"); }
  };
  const bonusTx = state.transactions.filter((t) => t.note.startsWith("Gift code"));
  return (
    <div className="safe-bottom">
      <PageHeader title="Gift" />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-gold text-night-950 text-center py-8"><Gift size={56} className="mx-auto animate-float" /><p className="font-black text-xl mt-3">Redeem your gift</p><p className="text-xs opacity-80">Enter the gift code below to claim your bonus</p></Card>
        <Card className={cn("space-y-3", shake && "animate-shake")}>
          <p className="text-xs text-white/60">Please enter the gift code</p>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. RUBYWIN" className="w-full h-12 rounded-xl bg-black/30 border border-white/10 px-3 font-black tracking-widest outline-none focus:border-gold-400" />
          <Button block size="lg" variant="gold" onClick={submit} disabled={!code.trim()}>Receive</Button>
          <p className="text-[11px] text-white/45 text-center">Hint: codes available right now → {Object.keys(GIFT_CODES).filter((c) => !state.activity.redeemedCodes.includes(c)).join(" · ") || "all claimed!"}</p>
        </Card>
        <Card>
          <h3 className="font-bold text-sm mb-3">Redemption history</h3>
          {bonusTx.length === 0 ? <EmptyState text="No gift codes redeemed yet" /> : (
            <div className="space-y-2">
              {bonusTx.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2">
                  <div><p className="text-xs font-bold">{t.note}</p><p className="text-[10px] text-white/40">{formatDateTime(t.createdAt)}</p></div>
                  <span className="text-sm font-black text-emerald-400">+{formatMoney(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export const Missions: React.FC = () => {
  const { missionProgress, claimMission, toast } = useApp();
  const claim = (id: string) => {
    const r = claimMission(id);
    if (r.ok) { sfx.win(); toast(r.message, "success"); } else { sfx.error(); toast(r.message, "error"); }
  };
  const list = MISSIONS.map((m) => ({ m, p: missionProgress(m) }));
  const completed = list.filter((x) => x.p.claimed).length;
  return (
    <div className="safe-bottom">
      <PageHeader title="Daily missions" />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-violet flex items-center justify-between">
          <div><p className="font-black text-lg">Today's progress</p><p className="text-xs text-white/80 mt-1">{completed}/{MISSIONS.length} missions claimed · resets at midnight</p></div>
          <div className="relative w-16 h-16"><svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" /><circle cx="18" cy="18" r="15.9" fill="none" stroke="#fde68a" strokeWidth="3" strokeDasharray={`${(completed / MISSIONS.length) * 100} 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-black">{Math.round((completed / MISSIONS.length) * 100)}%</span></div>
        </Card>
        {list.map(({ m, p }) => (
          <Card key={m.id} className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-gold-300">{m.type === "bets" ? <Dice5 size={21} /> : m.type === "volume" ? <Percent size={21} /> : m.type === "games" ? <Sparkles size={21} /> : m.type === "deposit" ? <CreditCard size={21} /> : <CalendarDays size={21} />}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{m.title}</p>
              <p className="text-[11px] text-white/50">{m.desc}</p>
              <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden"><div className={cn("h-full transition-all", p.done ? "grad-green" : "grad-violet")} style={{ width: `${Math.min(100, (p.progress / m.target) * 100)}%` }} /></div>
              <p className="text-[10px] text-white/40 mt-1">{m.type === "volume" ? formatMoney(p.progress, 0) : p.progress}/{m.type === "volume" ? formatMoney(m.target, 0) : m.target}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-gold-400 mb-1">+₹{m.reward}</p>
              {p.claimed ? <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Claimed</span> : <Button size="sm" variant={p.done ? "gold" : "dark"} disabled={!p.done} onClick={() => claim(m.id)}>{p.done ? "Claim" : "Go"}</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const Rebate: React.FC = () => {
  const { state, rebateAvailable, claimRebate, toast } = useApp();
  const vip = getVipLevel(state.user.totalBet);
  const available = rebateAvailable();
  const pendingVolume = Math.max(0, state.user.totalBet - state.activity.rebateBaseline);
  const claims = state.transactions.filter((t) => t.type === "rebate");
  const perGame = useMemo(() => {
    const map: Record<string, number> = {};
    state.bets.forEach((b) => { map[b.game] = (map[b.game] ?? 0) + b.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [state.bets]);
  const claim = () => { const r = claimRebate(); if (r.ok) { sfx.win(); toast(r.message, "success"); } else { sfx.error(); toast(r.message, "error"); } };
  return (
    <div className="safe-bottom">
      <PageHeader title="Betting rebate" />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-green text-center py-6">
          <p className="text-xs text-white/80">Rebate available</p>
          <p className="text-4xl font-black mt-1">{formatMoney(available)}</p>
          <p className="text-xs text-white/80 mt-1">VIP {vip.level} rate {vip.rebate}% · unsettled volume {formatMoney(pendingVolume, 0)}</p>
          <Button className="mt-4 bg-white text-emerald-700 shadow-none" variant="ghost" onClick={claim} disabled={available < 0.01}>Collect rebate</Button>
        </Card>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total wagered" value={formatMoney(state.user.totalBet, 0)} />
          <Stat label="Total rebated" value={formatMoney(claims.reduce((a, t) => a + t.amount, 0))} valueClass="text-emerald-400" />
          <Stat label="Last claim" value={state.activity.lastRebateClaim ? formatDateTime(state.activity.lastRebateClaim).slice(5, 16) : "—"} />
        </div>
        <Card>
          <h3 className="font-bold text-sm mb-3">Wagering by game</h3>
          {perGame.length === 0 ? <EmptyState text="Play games to accumulate rebate" /> : perGame.map(([g, v]) => (
            <div key={g} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-xs"><span className="font-bold">{GAME_LABELS[g] ?? g}</span><span className="text-white/70">{formatMoney(v)} → <span className="text-emerald-400 font-bold">{formatMoney((v * vip.rebate) / 100)}</span></span></div>
          ))}
        </Card>
        <Card>
          <h3 className="font-bold text-sm mb-2">Rebate rates by VIP level</h3>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((l) => { const lv = getVipLevel(l === 0 ? 0 : [0, 3000, 30000, 400000, 4000000, 20000000, 80000000, 300000000][l]); return <div key={l} className={cn("rounded-lg p-2 border", vip.level === l ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10")}><p className="font-bold">VIP {l}</p><p>{lv.rebate}%</p></div>; })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const Jackpot: React.FC = () => {
  const { state } = useApp();
  const biggest = useMemo(() => [...state.bets].filter((b) => b.result === "win").sort((a, b) => b.payout - a.payout).slice(0, 10), [state.bets]);
  const myBig = state.bets.filter((b) => b.result === "win" && b.payout >= 1000).slice(0, 10);
  const totalWon = state.user.totalWin;
  return (
    <div className="safe-bottom">
      <PageHeader title="Super Jackpot" />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-ruby-card border-gold-400/30 text-center py-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 50% 0%, #fde68a, transparent 60%)" }} />
          <p className="text-xs text-gold-300 font-bold tracking-widest relative">MY TOTAL WINNINGS</p>
          <p className="text-4xl font-black text-gold mt-1 tabular-nums relative">{formatMoney(totalWon, 2)}</p>
          <p className="text-[11px] text-white/70 mt-2 relative flex items-center justify-center gap-1"><Zap size={12} className="text-gold-300" /> Any single win ≥ ₹1,000 enters your jackpot hall of fame</p>
        </Card>
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 font-bold text-sm flex items-center gap-2"><Trophy size={16} className="text-gold-400" /> My biggest wins</div>
          <div className="divide-y divide-white/5">
            {biggest.length === 0 && <EmptyState text="Your biggest wins will appear here" />}
            {biggest.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn("w-7 h-7 rounded-full text-xs font-black flex items-center justify-center", i < 3 ? "grad-gold text-night-950" : "bg-white/10")}>{i + 1}</span>
                <div className="flex-1"><p className="text-xs font-bold">{GAME_LABELS[m.game] ?? m.game}</p><p className="text-[10px] text-white/50">{m.selectionLabel} · {(m.payout / m.amount).toFixed(2)}x</p></div>
                <span className="text-sm font-black text-gold-400">{formatMoney(m.payout, 0)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-sm mb-3">My jackpot wins</h3>
          {myBig.length === 0 ? <EmptyState text="Win ₹1,000+ in a single bet to appear here" /> : myBig.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"><div><p className="text-xs font-bold">{GAME_LABELS[b.game]} · {b.selectionLabel}</p><p className="text-[10px] text-white/40">{formatDateTime(b.createdAt)}</p></div><span className="text-sm font-black text-emerald-400">+{formatMoney(b.payout)}</span></div>
          ))}
        </Card>
      </div>
    </div>
  );
};
