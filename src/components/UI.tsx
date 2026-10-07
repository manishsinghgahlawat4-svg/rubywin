import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCircle2, Info, RefreshCw, Wallet, X, XCircle } from "lucide-react";
import { cn } from "../utils/cn";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../utils/helpers";
import { sfx } from "../utils/audio";
import { AVATARS, AVATAR_BG } from "../data";

// ---------- Balance chip with refresh animation ----------
export const BalanceChip: React.FC<{ className?: string; compact?: boolean }> = ({ className, compact }) => {
  const { state } = useApp();
  const [spinning, setSpinning] = useState(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
  }, [state.user.balance]);
  const refresh = () => {
    sfx.click();
    setSpinning(true);
    setTimeout(() => setSpinning(false), 800);
  };
  return (
    <button
      onClick={refresh}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-black/30 border border-white/10 px-3 py-1.5 text-sm font-semibold text-white btn-press transition",
        flash && "ring-2 ring-gold-400/70",
        className
      )}
    >
      <Wallet size={14} className="text-gold-400" />
      <span className={cn("tabular-nums", compact && "text-xs")}>{formatMoney(state.user.balance)}</span>
      <RefreshCw size={14} className={cn("text-white/70 transition-transform", spinning && "animate-spin")} />
    </button>
  );
};

// ---------- Sticky page header ----------
export const PageHeader: React.FC<{
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  showBalance?: boolean;
  className?: string;
  onBack?: () => void;
}> = ({ title, showBack = true, right, showBalance, className, onBack }) => {
  const { back } = useApp();
  return (
    <header className={cn("sticky top-0 z-40 backdrop-blur-md bg-night-900/85 border-b border-white/5", className)}>
      <div className="flex items-center justify-between h-14 px-3">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button onClick={onBack ?? back} className="p-2 -ml-1 rounded-full hover:bg-white/10 btn-press" aria-label="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="font-bold text-base truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showBalance && <BalanceChip compact />}
          {right}
        </div>
      </div>
    </header>
  );
};

// ---------- Buttons ----------
type Variant = "primary" | "gold" | "green" | "violet" | "ghost" | "outline" | "danger" | "dark";
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; block?: boolean; loading?: boolean }> = ({
  variant = "primary",
  size = "md",
  block,
  loading,
  className,
  children,
  disabled,
  onClick,
  ...rest
}) => {
  const variants: Record<Variant, string> = {
    primary: "grad-red text-white shadow-lg shadow-ruby-600/30",
    gold: "grad-gold text-night-950 shadow-lg shadow-gold-500/30",
    green: "grad-green text-white shadow-lg shadow-emerald-600/30",
    violet: "grad-violet text-white shadow-lg shadow-violet-600/30",
    ghost: "bg-white/5 text-white hover:bg-white/10",
    outline: "border border-white/20 text-white hover:bg-white/5",
    danger: "bg-red-600 text-white",
    dark: "bg-night-700 text-white border border-white/10",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-11 px-4 text-sm", lg: "h-12 px-6 text-base" };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onClick={(e) => {
        sfx.click();
        onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition btn-press disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        block && "w-full",
        className
      )}
    >
      {loading && <RefreshCw size={16} className="animate-spin" />}
      {children}
    </button>
  );
};

// ---------- Card ----------
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div {...rest} className={cn("rounded-2xl grad-dark border border-white/5 card-shadow p-4", className)}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ title: string; action?: React.ReactNode; icon?: React.ReactNode; className?: string }> = ({ title, action, icon, className }) => (
  <div className={cn("flex items-center justify-between mb-3", className)}>
    <div className="flex items-center gap-2">
      <span className="w-1 h-4 rounded-full grad-red" />
      {icon}
      <h2 className="font-bold text-sm">{title}</h2>
    </div>
    {action}
  </div>
);

// ---------- Modal / Bottom sheet ----------
export const Modal: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode; sheet?: boolean; hideClose?: boolean; className?: string }> = ({
  open,
  onClose,
  title,
  children,
  sheet = true,
  hideClose,
  className,
}) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className={cn("fixed inset-0 z-[60] flex justify-center", sheet ? "items-end" : "items-center")} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-[430px] bg-night-800 border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar",
          sheet ? "rounded-t-3xl animate-slide-up" : "rounded-3xl mx-4 max-w-[398px] animate-pop",
          className
        )}
      >
        {(title || !hideClose) && (
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-night-800">
            <h3 className="font-bold">{title}</h3>
            {!hideClose && (
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// ---------- Toasts ----------
export const Toasts: React.FC = () => {
  const { toasts } = useApp();
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-[400px] px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl animate-pop border",
            t.type === "success" && "bg-emerald-600 border-emerald-400/50 text-white",
            t.type === "error" && "bg-ruby-600 border-ruby-400/50 text-white",
            t.type === "info" && "bg-night-700 border-white/10 text-white"
          )}
        >
          {t.type === "success" && <CheckCircle2 size={16} />}
          {t.type === "error" && <XCircle size={16} />}
          {t.type === "info" && <Info size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
};

// ---------- Tabs ----------
export const Tabs: React.FC<{ tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void; className?: string; variant?: "pill" | "underline" }> = ({
  tabs,
  active,
  onChange,
  className,
  variant = "pill",
}) => (
  <div className={cn("flex gap-1 overflow-x-auto no-scrollbar", variant === "pill" ? "p-1 rounded-xl bg-black/30" : "border-b border-white/10", className)}>
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => {
          sfx.click();
          onChange(t.id);
        }}
        className={cn(
          "flex-1 whitespace-nowrap text-xs font-bold transition btn-press",
          variant === "pill" && "py-2 px-3 rounded-lg",
          variant === "pill" && (active === t.id ? "grad-red text-white shadow" : "text-white/60 hover:text-white"),
          variant === "underline" && "py-2.5 px-3 border-b-2",
          variant === "underline" && (active === t.id ? "border-ruby-500 text-white" : "border-transparent text-white/50")
        )}
      >
        {t.label}
      </button>
    ))}
  </div>
);

// ---------- Avatar ----------
export const Avatar: React.FC<{ index: number; size?: number; className?: string }> = ({ index, size = 48, className }) => (
  <div
    className={cn("rounded-full flex items-center justify-center shadow-lg border-2 border-white/20", AVATAR_BG[index % AVATAR_BG.length], className)}
    style={{ width: size, height: size, fontSize: size * 0.5 }}
  >
    {AVATARS[index % AVATARS.length]}
  </div>
);

// ---------- Empty ----------
export const EmptyState: React.FC<{ text: string; icon?: React.ReactNode }> = ({ text, icon }) => (
  <div className="flex flex-col items-center justify-center py-10 text-white/40 gap-2">
    {icon ?? <Bell size={28} />}
    <p className="text-sm">{text}</p>
  </div>
);

// ---------- Bet amount panel ----------
export const BetAmountPanel: React.FC<{
  amount: number;
  onChange: (v: number) => void;
  presets?: number[];
  min?: number;
  max?: number;
  disabled?: boolean;
  compact?: boolean;
}> = ({ amount, onChange, presets = [10, 50, 100, 500, 1000], min = 1, max = 100000, disabled, compact }) => {
  const { state } = useApp();
  const set = (v: number) => {
    const clamped = Math.max(min, Math.min(max, Math.round(v * 100) / 100));
    onChange(Number.isFinite(clamped) ? clamped : min);
  };
  return (
    <div className={cn("space-y-2", disabled && "opacity-60 pointer-events-none")}>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-black/30 rounded-xl border border-white/10 overflow-hidden">
          <button onClick={() => set(amount / 2)} className="px-3 h-11 text-xs font-bold text-white/70 hover:bg-white/5">
            ½
          </button>
          <div className="flex-1 flex items-center justify-center gap-1">
            <span className="text-gold-400 font-bold">₹</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              min={min}
              max={max}
              onChange={(e) => set(parseFloat(e.target.value) || min)}
              className="w-full bg-transparent text-center font-bold outline-none tabular-nums"
            />
          </div>
          <button onClick={() => set(amount * 2)} className="px-3 h-11 text-xs font-bold text-white/70 hover:bg-white/5">
            2×
          </button>
        </div>
        {!compact && (
          <button onClick={() => set(state.user.balance)} className="h-11 px-3 rounded-xl bg-white/5 text-xs font-bold text-white/70 hover:bg-white/10">
            MAX
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => set(p)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition btn-press",
              amount === p ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70"
            )}
          >
            ₹{p >= 1000 ? `${p / 1000}K` : p}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------- Stat tile ----------
export const Stat: React.FC<{ label: string; value: string | number; className?: string; valueClass?: string }> = ({ label, value, className, valueClass }) => (
  <div className={cn("rounded-xl bg-black/25 border border-white/5 p-3", className)}>
    <p className="text-[11px] text-white/50">{label}</p>
    <p className={cn("font-bold text-sm mt-0.5 tabular-nums truncate", valueClass)}>{value}</p>
  </div>
);

// ---------- Result banner for games ----------
export const ResultBanner: React.FC<{ result: { win: boolean; amount: number; text?: string } | null }> = ({ result }) => {
  if (!result) return null;
  return (
    <div
      key={result.amount + (result.text ?? "")}
      className={cn(
        "rounded-2xl p-4 text-center animate-pop border",
        result.win ? "bg-emerald-500/15 border-emerald-400/40" : "bg-ruby-500/15 border-ruby-400/40"
      )}
    >
      <p className={cn("text-2xl font-black", result.win ? "text-emerald-400" : "text-ruby-400")}>
        {result.win ? `+${formatMoney(result.amount)}` : "No luck this time"}
      </p>
      {result.text && <p className="text-xs text-white/60 mt-1">{result.text}</p>}
    </div>
  );
};

export const Pill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold", className)}>{children}</span>
);
