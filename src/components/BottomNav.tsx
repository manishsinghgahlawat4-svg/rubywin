import React from "react";
import { Gift, Home, Sparkles, User, Wallet } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";
import { sfx } from "../utils/audio";

const TABS = [
  { id: "/home", label: "Home", icon: Home },
  { id: "/activity", label: "Activity", icon: Gift },
  { id: "/promotion", label: "Promotion", icon: Sparkles, center: true },
  { id: "/wallet", label: "Wallet", icon: Wallet },
  { id: "/account", label: "Account", icon: User },
];

export const BottomNav: React.FC = () => {
  const { route, navigate } = useApp();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
      <div className="relative mx-2 mb-2 rounded-2xl bg-night-800/95 backdrop-blur-md border border-white/10 card-shadow">
        <div className="grid grid-cols-5 h-16">
          {TABS.map((t) => {
            const active = route === t.id || (t.id === "/home" && route === "/");
            const Icon = t.icon;
            if (t.center) {
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    sfx.click();
                    navigate(t.id);
                  }}
                  className="relative flex flex-col items-center justify-end pb-1.5"
                >
                  <span
                    className={cn(
                      "absolute -top-6 w-14 h-14 rounded-full grad-gold flex items-center justify-center border-4 border-night-900 shadow-xl animate-glow",
                      active ? "scale-110" : "animate-float"
                    )}
                  >
                    <Icon size={24} className="text-night-950" />
                  </span>
                  <span className={cn("text-[10px] font-bold", active ? "text-gold-400" : "text-white/60")}>{t.label}</span>
                </button>
              );
            }
            return (
              <button
                key={t.id}
                onClick={() => {
                  sfx.click();
                  navigate(t.id);
                }}
                className={cn("flex flex-col items-center justify-center gap-1 transition btn-press", active ? "text-ruby-400" : "text-white/55")}
              >
                <Icon size={22} className={cn(active && "animate-pop")} />
                <span className="text-[10px] font-bold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
