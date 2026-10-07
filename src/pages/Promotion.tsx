import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BookOpen, ChevronRight, Copy, Gift, Headphones, Link2, Share2, Users, Wallet } from "lucide-react";
import { readUserState, useApp } from "../context/AppContext";
import { Button, Card, EmptyState, PageHeader, Stat, Tabs } from "../components/UI";
import { COMMISSION_TIERS } from "../data";
import { copyToClipboard, formatDateTime, formatMoney } from "../utils/helpers";
import { sfx } from "../utils/audio";
import { IMG } from "../assets/images";

export interface ReferralRow {
  uid: string;
  name: string;
  phone: string;
  level: number;
  joined: number;
  deposit: number;
  bet: number;
  firstDeposit: boolean;
}

/** Real referral data from registered accounts — zeros until people actually sign up. */
export function useAgencyData() {
  const { state, accounts, storageVersion } = useApp();
  return useMemo(() => {
    const rows: ReferralRow[] = [];
    const visit = (codes: string[], level: number) => {
      if (!codes.length || level > 6) return;
      const children = accounts.filter((a) => a.referredBy && codes.includes(a.referredBy));
      children.forEach((a) => {
        const s = readUserState(a.uid);
        rows.push({ uid: a.uid, name: a.nickname, phone: a.phone, level, joined: a.createdAt, deposit: s?.user.totalDeposit ?? 0, bet: s?.user.totalBet ?? 0, firstDeposit: !!s?.user.hasMadeDeposit });
      });
      visit(children.map((c) => c.inviteCode), level + 1);
    };
    visit([state.user.inviteCode], 1);
    const direct = rows.filter((r) => r.level === 1);
    const commissionTx = state.transactions.filter((t) => t.type === "commission");
    const totalCommission = commissionTx.reduce((a, t) => a + t.amount, 0);
    const teamBet = rows.reduce((a, r) => a + r.bet, 0);
    const tier = [...COMMISSION_TIERS].reverse().find((t) => rows.length >= t.teamSize && teamBet >= t.teamBet) ?? COMMISSION_TIERS[0];
    return { rows, direct, team: rows, teamBet, totalCommission, commissionTx, tier };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, state.user.inviteCode, state.transactions, storageVersion]);
}

const inviteLinkFor = (code: string) => `${window.location.origin}${window.location.pathname}#/register?code=${code}`;

export const Promotion: React.FC = () => {
  const { state, navigate, toast } = useApp();
  const data = useAgencyData();
  const bonus = state.admin.bonuses;
  const inviteLink = inviteLinkFor(state.user.inviteCode);
  const stats = (rows: ReferralRow[]) => [["Registered", rows.length], ["Made a deposit", rows.filter((r) => r.firstDeposit).length], ["Deposit amount", formatMoney(rows.reduce((a, r) => a + r.deposit, 0), 0)], ["Total bets", formatMoney(rows.reduce((a, r) => a + r.bet, 0), 0)]];
  return (
    <div className="safe-bottom">
      <PageHeader title="Promotion" showBack={false} right={<button onClick={() => navigate("/subordinates")} className="text-xs font-bold text-ruby-400 px-2">Team</button>} />
      <div className="px-3 pt-3 space-y-4">
        <Card className="relative overflow-hidden border-gold-400/25 text-center py-6">
          <img src={IMG.poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-night-950/40 to-night-950/90" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/40 bg-gold-400/15 px-3 py-1 text-[10px] font-black tracking-[.18em] text-gold-200"><Gift size={12} /> REFERRAL BONUS {bonus.referralText}</span>
            <p className="text-4xl font-black tabular-nums mt-3">{formatMoney(data.totalCommission)}</p>
            <p className="text-[11px] text-white/70 mt-1">Total referral earnings credited to your wallet</p>
            <p className="text-xs text-white/80 mt-3 max-w-[300px] mx-auto">Share your code — you get a bonus on every friend's first approved deposit.</p>
          </div>
        </Card>

        <Card className="flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-[10px] text-white/50">Your invite code</p><p className="text-2xl font-black tracking-[.3em] text-gold-300">{state.user.inviteCode}</p></div>
          <Button size="sm" variant="gold" onClick={() => { copyToClipboard(state.user.inviteCode); toast("Invite code copied", "success"); }}><Copy size={14} /> Copy</Button>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-white/5">
            <div className="p-3">
              <p className="text-xs font-bold text-center py-1.5 rounded-lg grad-red mb-2 flex items-center justify-center gap-1"><Users size={12} /> Direct referrals</p>
              {stats(data.direct).map(([l, v]) => <div key={String(l)} className="text-center py-1.5"><p className="text-sm font-black">{v}</p><p className="text-[10px] text-white/50">{l}</p></div>)}
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-center py-1.5 rounded-lg grad-violet mb-2 flex items-center justify-center gap-1"><Users size={12} /> Whole team</p>
              {stats(data.team).map(([l, v]) => <div key={String(l)} className="text-center py-1.5"><p className="text-sm font-black">{v}</p><p className="text-[10px] text-white/50">{l}</p></div>)}
            </div>
          </div>
          {data.team.length === 0 && <p className="text-center text-[11px] text-white/45 px-4 py-3 border-t border-white/5">No referrals yet. Share your link — stats appear as soon as a friend registers with your code.</p>}
        </Card>

        <Button block size="lg" onClick={() => navigate("/invite")}><Share2 size={18} /> INVITATION LINK</Button>

        <Card className="p-0 divide-y divide-white/5">
          {[
            { icon: <Copy size={18} />, label: "Copy invitation code", value: state.user.inviteCode, action: () => { copyToClipboard(state.user.inviteCode); toast("Invitation code copied", "success"); } },
            { icon: <Link2 size={18} />, label: "Copy invitation link", value: "", action: () => { copyToClipboard(inviteLink); toast("Invitation link copied", "success"); } },
            { icon: <Users size={18} />, label: "Team members", value: String(data.team.length), action: () => navigate("/subordinates") },
            { icon: <Wallet size={18} />, label: "Referral earnings", value: formatMoney(data.totalCommission, 0), action: () => navigate("/commission") },
            { icon: <BookOpen size={18} />, label: "Referral rules", value: "", action: () => navigate("/promotion-rules") },
            { icon: <Headphones size={18} />, label: "Agent customer service", value: "", action: () => navigate("/service") },
          ].map((r) => (
            <button key={r.label} onClick={() => { sfx.click(); r.action(); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5">
              <span className="text-ruby-400">{r.icon}</span>
              <span className="flex-1 text-sm font-semibold">{r.label}</span>
              {r.value && <span className="text-xs font-mono text-gold-400">{r.value}</span>}
              <ChevronRight size={16} className="text-white/30" />
            </button>
          ))}
        </Card>

        <Card>
          <h3 className="font-bold text-sm mb-3">Your promotion data</h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Referral earnings" value={formatMoney(data.totalCommission)} valueClass="text-gold-400" />
            <Stat label="Bonuses received" value={data.commissionTx.length} valueClass="text-emerald-400" />
            <Stat label="Direct referrals" value={data.direct.length} />
            <Stat label="Total team" value={data.team.length} />
          </div>
          <div className="mt-3 rounded-xl bg-black/25 border border-white/5 p-3 flex items-center justify-between">
            <div><p className="text-[11px] text-white/50">Agent level</p><p className="font-black text-gold-400">Level {data.tier.level}</p></div>
            <div className="text-right"><p className="text-[11px] text-white/50">Referral offer</p><p className="font-black">{bonus.referralText}</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const Invite: React.FC = () => {
  const { state, toast } = useApp();
  const bonus = state.admin.bonuses;
  const inviteLink = inviteLinkFor(state.user.inviteCode);
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Join ${state.admin.brandName}`, text: `Join ${state.admin.brandName} with my invite code ${state.user.inviteCode}!`, url: inviteLink }); return; } catch { /* cancelled */ }
    }
    copyToClipboard(inviteLink);
    toast("Invitation link copied", "success");
  };
  return (
    <div className="safe-bottom">
      <PageHeader title="Invitation link" />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-ruby-card border-gold-400/30 text-center py-6">
          <p className="font-black text-xl">Invite friends · referral bonus {bonus.referralText}</p>
          <p className="text-xs text-white/75 mt-1">Earn on every friend's first approved deposit</p>
          <div className="inline-block p-3 bg-white rounded-2xl mt-4 shadow-xl"><QRCodeSVG value={inviteLink} size={180} level="M" /></div>
          <p className="text-[11px] text-white/60 mt-3">Scan to register with code</p>
          <p className="text-2xl font-black tracking-[0.3em] text-gold-300">{state.user.inviteCode}</p>
        </Card>
        <Card className="space-y-3">
          <div>
            <p className="text-xs text-white/60 mb-1">Invitation link</p>
            <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-white/10 px-3 h-12">
              <span className="flex-1 text-xs font-mono truncate">{inviteLink}</span>
              <button onClick={() => { copyToClipboard(inviteLink); toast("Link copied", "success"); }} className="p-2 rounded-lg bg-white/5"><Copy size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { copyToClipboard(state.user.inviteCode); toast("Code copied", "success"); }}><Copy size={16} /> Copy code</Button>
            <Button onClick={share}><Share2 size={16} /> Share</Button>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-sm mb-2">How it works</h3>
          <div className="space-y-3">
            {[["1", "Share your link or code", "Friends open the link — your invite code is filled in automatically."], ["2", "They register & deposit", "After their first deposit is approved, the bonus is calculated."], ["3", "You get paid instantly", `A random ${bonus.referralMin}–${bonus.referralMax}% of that first deposit lands in your wallet.`]].map(([n, t, d]) => (
              <div key={n} className="flex gap-3"><span className="w-7 h-7 rounded-full grad-red text-xs font-black flex items-center justify-center shrink-0">{n}</span><div><p className="text-sm font-bold">{t}</p><p className="text-xs text-white/55">{d}</p></div></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const Subordinates: React.FC = () => {
  const data = useAgencyData();
  const [tab, setTab] = useState("direct");
  const [search, setSearch] = useState("");
  const list = (tab === "direct" ? data.direct : data.team).filter((s) => !search || s.uid.includes(search) || s.phone.includes(search));
  return (
    <div className="safe-bottom">
      <PageHeader title="Team members" />
      <div className="px-3 pt-3 space-y-3">
        <Tabs tabs={[{ id: "direct", label: `Direct (${data.direct.length})` }, { id: "team", label: `Team (${data.team.length})` }]} active={tab} onChange={setTab} />
        <input value={search} onChange={(e) => setSearch(e.target.value.replace(/\D/g, ""))} placeholder="Search by UID or mobile" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Deposit amount" value={formatMoney(list.reduce((a, s) => a + s.deposit, 0), 0)} />
          <Stat label="Bet amount" value={formatMoney(list.reduce((a, s) => a + s.bet, 0), 0)} />
          <Stat label="Deposited" value={list.filter((s) => s.firstDeposit).length} valueClass="text-gold-400" />
        </div>
        {list.length === 0 && <EmptyState text="No team members yet. Share your invite link to get started." />}
        {list.map((s) => (
          <Card key={s.uid} className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-ruby-500 to-gold-500 flex items-center justify-center text-xs font-black text-white border border-white/15">{s.name.slice(0, 2).toUpperCase()}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{s.name} <span className="text-[10px] font-normal text-white/40">UID {s.uid}</span></p>
              <p className="text-[10px] text-white/50">Level {s.level} · joined {formatDateTime(s.joined).slice(0, 10)} · {s.firstDeposit ? "deposited" : "no deposit yet"}</p>
            </div>
            <div className="text-right text-[11px]">
              <p>Bet <span className="font-bold">{formatMoney(s.bet, 0)}</span></p>
              <p className="text-gold-400 font-bold">Dep {formatMoney(s.deposit, 0)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const CommissionDetail: React.FC = () => {
  const data = useAgencyData();
  return (
    <div className="safe-bottom">
      <PageHeader title="Referral earnings" />
      <div className="px-3 pt-3 space-y-3">
        <Card className="grad-gold text-night-950"><p className="text-xs font-bold opacity-80">Total referral earnings</p><p className="text-3xl font-black">{formatMoney(data.totalCommission)}</p><p className="text-[11px] opacity-80 mt-1">Credited automatically when a referred friend's first deposit is approved</p></Card>
        {data.commissionTx.length === 0 ? <Card><EmptyState text="No referral bonuses yet" /></Card> : (
          <Card className="p-0 divide-y divide-white/5">{data.commissionTx.map((c) => <div key={c.id} className="flex items-center justify-between px-4 py-3 text-xs"><div><p className="font-bold">{c.note}</p><p className="text-[10px] text-white/40">{formatDateTime(c.createdAt)}</p></div><span className="font-black text-emerald-400">+{formatMoney(c.amount)}</span></div>)}</Card>
        )}
      </div>
    </div>
  );
};

export const PromotionRules: React.FC = () => {
  const { state } = useApp();
  const bonus = state.admin.bonuses;
  return (
    <div className="safe-bottom">
      <PageHeader title="Referral rules" />
      <div className="px-3 pt-3 space-y-3">
        <Card className="grad-violet"><p className="font-black">Referral bonus program</p><p className="text-xs text-white/85 mt-1">Every account has a unique 6-character invite code. Share it and earn a bonus on every friend's first deposit.</p></Card>
        <Card>
          <h3 className="font-bold text-sm mb-2">Rules</h3>
          <ol className="text-xs text-white/65 space-y-2 list-decimal pl-4">
            <li>A friend must enter your invite code while registering. Codes cannot be added later.</li>
            <li>When your friend's first deposit is approved, you receive a random {bonus.referralMin}–{bonus.referralMax}% of that deposit (advertised offer: {bonus.referralText}).</li>
            <li>The bonus is credited automatically to your wallet and appears under Referral earnings.</li>
            <li>Team statistics only count real registered accounts linked to your code.</li>
            <li>Self-referral, duplicate accounts or abuse will forfeit referral bonuses.</li>
          </ol>
        </Card>
        <Card className="p-0 overflow-hidden">
          <div className="px-3 py-2 grad-red text-[11px] font-bold">Agent levels (team size · team bets)</div>
          <div className="divide-y divide-white/5">
            {COMMISSION_TIERS.map((t) => (
              <div key={t.level} className="grid grid-cols-3 text-[11px] px-3 py-2.5 items-center">
                <span className="font-black text-gold-400">Level {t.level}</span><span>{t.teamSize} members</span><span>{t.teamBet >= 1e7 ? `${t.teamBet / 1e7}Cr` : t.teamBet >= 1e5 ? `${t.teamBet / 1e5}L` : t.teamBet} bets</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
