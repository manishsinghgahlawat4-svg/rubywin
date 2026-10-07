import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BookOpen, ChevronRight, Copy, Crown, Gamepad2, Headphones, History, Info, Languages, LogOut, MessageSquare, Pencil, Send, Settings as SettingsIcon, ShieldCheck, Trophy, Volume2, Wallet as WalletIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Avatar, Button, Card, EmptyState, Modal, PageHeader, SectionTitle, Stat, Tabs } from "../components/UI";
import { AVATARS, CHAT_KB, GAMES, GAME_LABELS, QUICK_QUESTIONS, VIP_LEVELS, getVipLevel } from "../data";
import { cn } from "../utils/cn";
import { copyToClipboard, formatCompact, formatDateTime, formatMoney, startOfDay } from "../utils/helpers";
import { sfx } from "../utils/audio";
import { BetRow } from "../games/lottery/LotteryShared";
import { BrandMark, gameArtwork } from "../components/GameArtwork";

// ================= ACCOUNT HUB =================
export const Account: React.FC = () => {
  const { state, navigate, toast, unreadCount, logout } = useApp();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const vip = getVipLevel(state.user.totalBet);
  const nextVip = VIP_LEVELS.find((l) => l.level === vip.level + 1);
  const progress = nextVip ? Math.min(100, ((state.user.totalBet - vip.exp) / (nextVip.exp - vip.exp)) * 100) : 100;
  const todayStart = startOfDay();
  const todayBets = state.bets.filter((b) => b.createdAt >= todayStart);
  const todayNet = todayBets.reduce((a, b) => a + b.payout - b.amount, 0);

  const rows = [
    { icon: <Gamepad2 size={18} />, label: "Game history", desc: "My game history", route: "/bet-history", cls: "text-ruby-400" },
    { icon: <History size={18} />, label: "Transaction", desc: "My transaction history", route: "/transactions", cls: "text-emerald-400" },
    { icon: <WalletIcon size={18} />, label: "Deposit", desc: "My deposit history", route: "/deposit-history", cls: "text-gold-400" },
    { icon: <WalletIcon size={18} />, label: "Withdraw", desc: "My withdraw history", route: "/withdraw-history", cls: "text-sky-400" },
  ];
  const services = [
    { icon: <Bell size={18} />, label: "Notification", route: "/notifications", badge: unreadCount },
    { icon: <Trophy size={18} />, label: "Game statistics", route: "/game-stats" },
    { icon: <SettingsIcon size={18} />, label: "Settings", route: "/settings" },
    { icon: <MessageSquare size={18} />, label: "Feedback", route: "/feedback" },
    { icon: <BookOpen size={18} />, label: "Announcement", route: "/announcement" },
    { icon: <Headphones size={18} />, label: "24/7 Customer service", route: "/service" },
    { icon: <Info size={18} />, label: "About us", route: "/about" },
    { icon: <ShieldCheck size={18} />, label: "Admin panel", route: "/admin" },
  ];

  return (
    <div className="safe-bottom">
      <div className="grad-ruby-card pb-16 pt-4 px-4 rounded-b-[2rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="relative"><Avatar index={state.user.avatar} size={64} /><span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-night-900 flex items-center justify-center"><Pencil size={12} /></span></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><p className="font-black text-lg truncate">{state.user.nickname}</p><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r text-night-950", vip.color)}>VIP{vip.level}</span></div>
            <button onClick={() => { copyToClipboard(state.user.uid); toast("UID copied", "success"); }} className="flex items-center gap-1 text-xs text-white/70 mt-1 bg-black/25 px-2 py-0.5 rounded-full"><span>UID | {state.user.uid}</span><Copy size={11} /></button>
            <p className="text-[10px] text-white/50 mt-1">Last login: {formatDateTime(Date.now()).slice(0, 16)}</p>
          </div>
        </div>
      </div>

      <div className="px-3 -mt-12 space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-white/50">Total balance</p><p className="text-2xl font-black tabular-nums">{formatMoney(state.user.balance)}</p></div>
            <Crown size={28} className="text-gold-400" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[{ l: "Wallet", e: "👛", r: "/wallet" }, { l: "Deposit", e: "💳", r: "/deposit" }, { l: "Withdraw", e: "🏧", r: "/withdraw" }, { l: "VIP", e: "👑", r: "/vip" }].map((a) => (
              <button key={a.l} onClick={() => { sfx.click(); navigate(a.r); }} className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-white/5 btn-press"><span className="text-2xl">{a.e}</span><span className="text-[11px] font-semibold">{a.l}</span></button>
            ))}
          </div>
        </Card>

        <button onClick={() => navigate("/vip")} className="w-full rounded-2xl grad-dark border border-gold-500/20 p-3 text-left card-shadow btn-press">
          <div className="flex items-center justify-between text-xs"><span className="font-bold text-gold-400 flex items-center gap-1"><Crown size={14} /> VIP {vip.level}</span><span className="text-white/50">{nextVip ? `${formatCompact(state.user.totalBet)} / ${formatCompact(nextVip.exp)} EXP` : "MAX level"}</span></div>
          <div className="h-2 rounded-full bg-white/10 mt-2 overflow-hidden"><div className="h-full grad-gold transition-all" style={{ width: `${progress}%` }} /></div>
        </button>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Today's bets" value={todayBets.length} />
          <Stat label="Today's wagered" value={formatMoney(todayBets.reduce((a, b) => a + b.amount, 0), 0)} />
          <Stat label="Today's P/L" value={`${todayNet >= 0 ? "+" : ""}${formatMoney(todayNet, 0)}`} valueClass={todayNet >= 0 ? "text-emerald-400" : "text-ruby-400"} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => (
            <button key={r.label} onClick={() => { sfx.click(); navigate(r.route); }} className="rounded-2xl grad-dark border border-white/5 p-3 flex items-center gap-3 text-left btn-press"><span className={cn("w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center", r.cls)}>{r.icon}</span><div><p className="text-sm font-bold">{r.label}</p><p className="text-[10px] text-white/45">{r.desc}</p></div></button>
          ))}
        </div>

        <div>
          <SectionTitle title="Service center" />
          <Card className="p-0 divide-y divide-white/5">
            {services.map((s) => (
              <button key={s.label} onClick={() => { sfx.click(); navigate(s.route); }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left">
                <span className="text-ruby-400">{s.icon}</span><span className="flex-1 text-sm font-semibold">{s.label}</span>
                {!!s.badge && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-ruby-500 text-[10px] font-bold flex items-center justify-center">{s.badge}</span>}
                <ChevronRight size={16} className="text-white/30" />
              </button>
            ))}
          </Card>
        </div>

        <Button block variant="outline" className="border-ruby-500/50 text-ruby-400" onClick={() => setLogoutOpen(true)}><LogOut size={16} /> Log out</Button>
        <p className="text-center text-[10px] text-white/30 pb-2">{state.admin.brandName} v1.0.0 · Mobile {state.user.phone ? `•••••${state.user.phone.slice(-5)}` : ""}</p>
      </div>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Log out?" sheet={false}>
        <p className="text-sm text-white/70">Your balance, bets and history stay saved on this device. Log back in any time with your mobile number and password.</p>
        <div className="flex gap-2 mt-4"><Button variant="ghost" className="flex-1" onClick={() => setLogoutOpen(false)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={() => { logout(); setLogoutOpen(false); toast("Logged out", "info"); navigate("/login"); }}>Log out</Button></div>
      </Modal>
    </div>
  );
};

// ================= SETTINGS =================
export const Settings: React.FC = () => {
  const { state, updateProfile, setSound, setLanguage, toast } = useApp();
  const [nick, setNick] = useState(state.user.nickname);
  const [phone, setPhone] = useState(state.user.phone);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old: "", next: "", confirm: "" });
  const saveProfile = () => {
    if (!/^[A-Za-z0-9_ ]{3,20}$/.test(nick.trim())) return toast("Nickname must be 3-20 letters/numbers", "error");
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return toast("Enter a valid 10-digit mobile number", "error");
    updateProfile({ nickname: nick.trim(), phone });
    toast("Profile updated", "success");
  };
  const savePw = () => {
    if (state.user.password && pw.old !== state.user.password) return toast("Current password is incorrect", "error");
    if (pw.next.length < 6) return toast("New password must be at least 6 characters", "error");
    if (pw.next !== pw.confirm) return toast("Passwords do not match", "error");
    updateProfile({ password: pw.next });
    setPw({ old: "", next: "", confirm: "" });
    setPwOpen(false);
    toast("Password changed", "success");
  };
  return (
    <div className="safe-bottom">
      <PageHeader title="Settings" />
      <div className="px-3 pt-3 space-y-4">
        <Card>
          <h3 className="font-bold text-sm mb-3">Choose avatar</h3>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((_, i) => (
              <button key={i} onClick={() => { sfx.click(); updateProfile({ avatar: i }); }} className={cn("rounded-full p-0.5 border-2 transition btn-press", state.user.avatar === i ? "border-gold-400 scale-110" : "border-transparent")}><Avatar index={i} size={44} /></button>
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          <div><p className="text-xs text-white/60 mb-1">Nickname</p><input value={nick} onChange={(e) => setNick(e.target.value)} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm font-semibold outline-none" /></div>
          <div><p className="text-xs text-white/60 mb-1">Mobile number</p><input value={phone} inputMode="numeric" onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Add mobile number" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm font-semibold outline-none" /></div>
          <div><p className="text-xs text-white/60 mb-1">UID</p><div className="h-11 rounded-xl bg-black/20 border border-white/5 px-3 flex items-center text-sm text-white/50">{state.user.uid}</div></div>
          <Button block onClick={saveProfile}>Save profile</Button>
        </Card>
        <Card className="p-0 divide-y divide-white/5">
          <div className="flex items-center justify-between px-4 py-3.5"><span className="flex items-center gap-3 text-sm font-semibold"><Volume2 size={18} className="text-ruby-400" /> Sound effects</span><button onClick={() => setSound(!state.settings.sound)} className={cn("w-12 h-6 rounded-full relative transition", state.settings.sound ? "grad-green" : "bg-white/15")}><span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", state.settings.sound ? "left-6" : "left-0.5")} /></button></div>
          <div className="flex items-center justify-between px-4 py-3.5"><span className="flex items-center gap-3 text-sm font-semibold"><Languages size={18} className="text-ruby-400" /> Language</span><select value={state.settings.language} onChange={(e) => setLanguage(e.target.value)} className="bg-black/30 rounded-lg px-2 py-1 text-xs outline-none">{["English", "हिन्दी", "বাংলা", "தமிழ்", "తెలుగు"].map((l) => <option key={l} className="bg-night-800">{l}</option>)}</select></div>
          <button onClick={() => setPwOpen(true)} className="w-full flex items-center justify-between px-4 py-3.5 text-left"><span className="flex items-center gap-3 text-sm font-semibold"><ShieldCheck size={18} className="text-ruby-400" /> Login password</span><span className="text-xs text-white/50 flex items-center gap-1">{state.user.password ? "Change" : "Set"} <ChevronRight size={14} /></span></button>
        </Card>
      </div>
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Login password">
        <div className="space-y-3">
          {state.user.password && <input type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} placeholder="Current password" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />}
          <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="New password (min 6 chars)" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
          <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} placeholder="Confirm new password" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
          <Button block onClick={savePw}>Save password</Button>
        </div>
      </Modal>
    </div>
  );
};

// ================= VIP =================
export const Vip: React.FC = () => {
  const { state, claimVipReward, toast } = useApp();
  const vip = getVipLevel(state.user.totalBet);
  const [view, setView] = useState(vip.level);
  const lv = VIP_LEVELS[view];
  const next = VIP_LEVELS[view + 1];
  const claim = (level: number) => { const r = claimVipReward(level); if (r.ok) { sfx.bigWin(); toast(r.message, "success"); } else { sfx.error(); toast(r.message, "error"); } };
  return (
    <div className="safe-bottom">
      <PageHeader title="VIP" />
      <div className="px-3 pt-3 space-y-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x -mx-3 px-3">
          {VIP_LEVELS.slice(0, 10).map((l) => {
            const reached = state.user.totalBet >= l.exp;
            return (
              <button key={l.level} onClick={() => { sfx.click(); setView(l.level); }} className={cn("snap-center shrink-0 w-[300px] rounded-2xl p-4 text-left bg-gradient-to-br border card-shadow btn-press", l.color, view === l.level ? "border-white/60" : "border-transparent opacity-80", !reached && "grayscale-[0.4]")}>
                <div className="flex items-center justify-between"><span className="font-black text-xl text-night-950 drop-shadow">VIP {l.level}</span><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white">{reached ? "ACHIEVED" : "LOCKED"}</span></div>
                <p className="text-xs text-night-950/80 mt-1 font-semibold">Requires {formatCompact(l.exp)} EXP</p>
                <div className="h-1.5 rounded-full bg-black/30 mt-3 overflow-hidden"><div className="h-full bg-white" style={{ width: `${Math.min(100, (state.user.totalBet / Math.max(1, l.exp)) * 100)}%` }} /></div>
                <p className="text-[10px] text-night-950/80 mt-1 font-semibold">{formatCompact(state.user.totalBet)} / {formatCompact(l.exp)}</p>
              </button>
            );
          })}
        </div>
        <Card>
          <div className="flex items-center justify-between"><p className="font-black">VIP {lv.level} benefits</p>{next && <span className="text-[11px] text-white/50">Next: VIP {next.level} at {formatCompact(next.exp)}</span>}</div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="Level-up reward" value={formatMoney(lv.levelUpReward, 0)} valueClass="text-gold-400" />
            <Stat label="Monthly reward" value={formatMoney(lv.monthlyReward, 0)} valueClass="text-emerald-400" />
            <Stat label="Rebate rate" value={`${lv.rebate}%`} valueClass="text-violet-300" />
          </div>
          {lv.level > 0 && <Button block className="mt-3" variant="gold" disabled={state.user.totalBet < lv.exp || state.activity.vipClaimed.includes(lv.level)} onClick={() => claim(lv.level)}>{state.activity.vipClaimed.includes(lv.level) ? "Reward claimed ✓" : state.user.totalBet < lv.exp ? `Reach VIP ${lv.level} to claim` : `Claim ${formatMoney(lv.levelUpReward, 0)} reward`}</Button>}
        </Card>
        <Card>
          <h3 className="font-bold text-sm mb-2">How EXP works</h3>
          <ul className="text-xs text-white/60 space-y-1.5 list-disc pl-4">
            <li>Every ₹1 wagered on any game = 1 EXP. EXP never decreases.</li>
            <li>Level-up rewards can be claimed once per level. Monthly rewards are issued on the 1st of each month.</li>
            <li>Higher VIP levels unlock higher betting rebate percentages and priority withdrawals.</li>
          </ul>
        </Card>
        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-4 text-[11px] font-bold px-3 py-2 grad-gold text-night-950"><span>Level</span><span>EXP</span><span>Level-up</span><span>Rebate</span></div>
          <div className="divide-y divide-white/5">{VIP_LEVELS.slice(0, 10).map((l) => <div key={l.level} className={cn("grid grid-cols-4 text-[11px] px-3 py-2", vip.level === l.level && "bg-gold-500/10")}><span className="font-bold">VIP {l.level}</span><span>{formatCompact(l.exp)}</span><span>{formatMoney(l.levelUpReward, 0)}</span><span>{l.rebate}%</span></div>)}</div>
        </Card>
      </div>
    </div>
  );
};

// ================= GAME STATS =================
export const GameStats: React.FC = () => {
  const { state } = useApp();
  const [range, setRange] = useState("today");
  const since = range === "today" ? startOfDay() : range === "week" ? Date.now() - 7 * 86400000 : range === "month" ? Date.now() - 30 * 86400000 : 0;
  const bets = useMemo(() => state.bets.filter((b) => b.createdAt >= since && b.result !== "pending"), [state.bets, since]);
  const per = useMemo(() => {
    const map: Record<string, { count: number; wagered: number; won: number; wins: number }> = {};
    bets.forEach((b) => { const m = (map[b.game] ??= { count: 0, wagered: 0, won: 0, wins: 0 }); m.count++; m.wagered += b.amount; m.won += b.payout; if (b.result === "win") m.wins++; });
    return Object.entries(map).sort((a, b) => b[1].wagered - a[1].wagered);
  }, [bets]);
  const totals = { count: bets.length, wagered: bets.reduce((a, b) => a + b.amount, 0), won: bets.reduce((a, b) => a + b.payout, 0) };
  const biggest = [...bets].sort((a, b) => b.payout - a.payout)[0];
  return (
    <div className="safe-bottom">
      <PageHeader title="Game statistics" />
      <div className="px-3 pt-3 space-y-4">
        <Tabs tabs={[{ id: "today", label: "Today" }, { id: "week", label: "7 days" }, { id: "month", label: "30 days" }, { id: "all", label: "All" }]} active={range} onChange={setRange} />
        <Card className="grad-ruby-card border-ruby-400/20">
          <div className="grid grid-cols-3 text-center">
            <div><p className="text-xl font-black">{totals.count}</p><p className="text-[10px] text-white/70">Bets</p></div>
            <div><p className="text-xl font-black">{formatCompact(totals.wagered)}</p><p className="text-[10px] text-white/70">Wagered</p></div>
            <div><p className={cn("text-xl font-black", totals.won - totals.wagered >= 0 ? "text-emerald-300" : "text-gold-300")}>{totals.won - totals.wagered >= 0 ? "+" : ""}{formatCompact(totals.won - totals.wagered)}</p><p className="text-[10px] text-white/70">Net profit</p></div>
          </div>
          {biggest && <p className="text-[11px] text-white/80 mt-3 text-center flex items-center justify-center gap-1"><Trophy size={13} className="text-gold-200" /> Biggest win: {formatMoney(biggest.payout)} on {GAME_LABELS[biggest.game]}</p>}
        </Card>
        {per.length === 0 && <EmptyState text="No settled bets in this period" />}
        {per.map(([g, m]) => {
          const net = m.won - m.wagered;
          return (
            <Card key={g} className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl overflow-hidden border border-white/10"><img src={gameArtwork(g)} alt="" className="h-full w-full object-cover" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{GAME_LABELS[g] ?? g}</p>
                <p className="text-[10px] text-white/50">{m.count} bets · win rate {Math.round((m.wins / m.count) * 100)}% · wagered {formatMoney(m.wagered, 0)}</p>
                <div className="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden"><div className="h-full grad-gold" style={{ width: `${Math.min(100, (m.wagered / Math.max(1, totals.wagered)) * 100)}%` }} /></div>
              </div>
              <span className={cn("text-sm font-black tabular-nums", net >= 0 ? "text-emerald-400" : "text-ruby-400")}>{net >= 0 ? "+" : ""}{formatMoney(net, 0)}</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ================= BET HISTORY =================
export const BetHistory: React.FC = () => {
  const { state } = useApp();
  const [game, setGame] = useState("all");
  const list = state.bets.filter((b) => game === "all" || b.game === game).slice(0, 100);
  return (
    <div className="safe-bottom">
      <PageHeader title="Game history" />
      <div className="px-3 pt-3 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[{ id: "all", name: "All" }, ...GAMES].map((g) => <button key={g.id} onClick={() => setGame(g.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border", game === g.id ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/70")}>{g.name}</button>)}
        </div>
        {list.length === 0 ? <EmptyState text="No game records" /> : <div className="space-y-2">{list.map((b) => <div key={b.id}><p className="text-[10px] text-white/40 px-1 mb-1">{GAME_LABELS[b.game]}</p><BetRow bet={b} /></div>)}</div>}
      </div>
    </div>
  );
};

// ================= NOTIFICATIONS =================
export const Notifications: React.FC = () => {
  const { state, markNotificationsRead } = useApp();
  useEffect(() => { const t = setTimeout(markNotificationsRead, 800); return () => clearTimeout(t); }, [markNotificationsRead]);
  return (
    <div className="safe-bottom">
      <PageHeader title="Notifications" />
      <div className="px-3 pt-3 space-y-2">
        {state.notifications.length === 0 && <EmptyState text="No notifications" />}
        {state.notifications.map((n) => (
          <Card key={n.id} className={cn("flex gap-3", !n.read && "border-ruby-500/40")}>
            <span className="w-9 h-9 rounded-xl grad-red flex items-center justify-center shrink-0"><Bell size={16} /></span>
            <div className="flex-1 min-w-0"><div className="flex items-center justify-between"><p className="text-sm font-bold">{n.title}</p>{!n.read && <span className="w-2 h-2 rounded-full bg-ruby-500" />}</div><p className="text-xs text-white/65 mt-1">{n.message}</p><p className="text-[10px] text-white/35 mt-1">{formatDateTime(n.createdAt)}</p></div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ================= CUSTOMER SERVICE =================
interface ChatMsg { id: number; from: "bot" | "me"; text: string; ts: number }
export const CustomerService: React.FC = () => {
  const { state } = useApp();
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ id: 1, from: "bot", text: `Hi ${state.user.nickname}! 👋 I'm Ruby, your virtual assistant. Ask me about deposits, withdrawals, bonuses, VIP or any game.`, ts: Date.now() }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);
  const answer = (q: string) => {
    const lower = q.toLowerCase();
    const hit = CHAT_KB.find((k) => k.keys.some((key) => lower.includes(key)));
    if (lower.includes("balance")) return `Your current balance is ${formatMoney(state.user.balance)}. Total wagered ${formatMoney(state.user.totalBet)} · VIP ${getVipLevel(state.user.totalBet).level}.`;
    if (lower.includes("uid") || lower.includes("my id")) return `Your UID is ${state.user.uid}. Share it with support agents when raising a ticket.`;
    if (lower.includes("pending")) { const p = state.deposits.filter((d) => d.status === "pending").length; return p ? `You have ${p} pending deposit(s). They are usually verified within 5-10 minutes.` : "You have no pending deposits right now."; }
    return hit?.answer ?? "I'm not sure about that yet 🤔. Try asking about deposits, withdrawals, gift codes, VIP, commissions or a specific game — or type 'human' to reach a live agent.";
  };
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sfx.click();
    setMsgs((m) => [...m, { id: Date.now(), from: "me", text: t, ts: Date.now() }]);
    setInput("");
    setTyping(true);
    setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { id: Date.now() + 1, from: "bot", text: answer(t), ts: Date.now() }]); sfx.notify(); }, 700 + Math.random() * 600);
  };
  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Customer service" right={<span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online</span>} />
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex gap-2", m.from === "me" ? "justify-end" : "justify-start")}>
            {m.from === "bot" && <span className="w-8 h-8 rounded-full grad-red flex items-center justify-center text-sm shrink-0">🤖</span>}
            <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm animate-pop", m.from === "me" ? "grad-red rounded-br-sm" : "bg-night-700 border border-white/5 rounded-bl-sm")}>{m.text}<p className="text-[9px] opacity-50 mt-1 text-right">{formatDateTime(m.ts).slice(11, 16)}</p></div>
          </div>
        ))}
        {typing && <div className="flex gap-2"><span className="w-8 h-8 rounded-full grad-red flex items-center justify-center text-sm">🤖</span><div className="bg-night-700 rounded-2xl px-4 py-3 flex gap-1"><span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" /><span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:120ms]" /><span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:240ms]" /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-white/5 bg-night-900 p-3 pb-6 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">{QUICK_QUESTIONS.map((q) => <button key={q} onClick={() => send(q)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold whitespace-nowrap">{q}</button>)}</div>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="Type your message…" className="flex-1 h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
          <Button className="w-11 px-0" onClick={() => send(input)}><Send size={18} /></Button>
        </div>
      </div>
    </div>
  );
};

// ================= MISC PAGES =================
export const Announcement: React.FC = () => {
  const { state } = useApp();
  return (
    <div className="safe-bottom">
      <PageHeader title="Announcement" />
      <div className="px-3 pt-3 space-y-3">{state.admin.announcements.map((a, i) => <Card key={i}><p className="font-bold text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ruby-500" />{a.title}</p><p className="text-xs text-white/65 mt-2 leading-relaxed">{a.body}</p></Card>)}</div>
    </div>
  );
};

export const Feedback: React.FC = () => {
  const { toast, navigate } = useApp();
  const [type, setType] = useState("Suggestion");
  const [text, setText] = useState("");
  const submit = () => { if (text.trim().length < 10) return toast("Please describe your feedback (min 10 characters)", "error"); toast("Thanks! Your feedback has been submitted", "success"); setText(""); navigate("/account"); };
  return (
    <div className="safe-bottom">
      <PageHeader title="Feedback" />
      <div className="px-3 pt-3 space-y-3">
        <Card className="space-y-3">
          <div className="grid grid-cols-3 gap-2">{["Suggestion", "Bug report", "Complaint"].map((t) => <button key={t} onClick={() => setType(t)} className={cn("py-2 rounded-xl text-xs font-bold border", type === t ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/70")}>{t}</button>)}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={6} placeholder="Tell us what you think… (reward of ₹10-₹500 for valuable feedback)" className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm outline-none resize-none" />
          <p className="text-[10px] text-white/40 text-right">{text.length}/500</p>
          <Button block onClick={submit}>Submit feedback</Button>
        </Card>
      </div>
    </div>
  );
};

export const About: React.FC = () => (
  <div className="safe-bottom">
    <PageHeader title="About us" />
    <div className="px-3 pt-3 space-y-3">
      <Card className="grad-ruby-card text-center py-8"><BrandMark className="w-20 h-20 mx-auto" /><p className="font-black text-2xl mt-2">Ruby<span className="text-gold">Win</span></p><p className="text-xs text-white/70">Version 1.0.0 · Demo build</p></Card>
      {[["Confidentiality agreement", "We never share your data. All information in this demo is stored locally in your browser only."], ["Risk disclosure", "RubyWin is a demonstration gaming platform using virtual currency. No real money is involved. Gambling can be addictive — play responsibly and only if you are 18+."], ["Fairness", "Every game outcome is generated from a deterministic seeded RNG. Lottery results are seeded by the period id so they are reproducible and tamper-proof."], ["Contact", "support@rubywin.demo · Telegram @RubyWinSupport · 09:00 – 23:00 IST"]].map(([t, d]) => <Card key={t}><p className="font-bold text-sm">{t}</p><p className="text-xs text-white/65 mt-1 leading-relaxed">{d}</p></Card>)}
    </div>
  </div>
);
