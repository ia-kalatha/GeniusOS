// ─── CoinWidget — saldo de DevCoins no sidebar ────────────────────────────────
import React, { memo, useEffect, useRef, useState } from "react";
import { useRewards } from "../context/RewardsContext";

function CoinWidget({ compact = false, onClickPending }: { compact?: boolean; onClickPending?: () => void }) {
  const { balance, boostActive, pendingCount, pendingCoins } = useRewards();
  const [display, setDisplay] = useState(balance);
  const prevRef = useRef(balance);
  const rafRef  = useRef<number>(0);

  // Animação count-up/down quando balance muda
  useEffect(() => {
    const from = prevRef.current;
    const to   = balance;
    if (from === to) return;
    prevRef.current = to;

    const diff  = to - from;
    const steps = Math.min(30, Math.abs(diff));
    let   step  = 0;

    const animate = () => {
      step++;
      const t = step / steps;
      setDisplay(Math.round(from + diff * t));
      if (step < steps) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [balance]);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/60 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-400">
        🪙 {display.toLocaleString()}
        {boostActive && <span className="text-cyan-400 animate-pulse">2×</span>}
        {pendingCount > 0 && (
          <span className="text-emerald-400 animate-pulse">+{pendingCount}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${
        boostActive
          ? "bg-amber-500/10 border-amber-500/30 shadow-inner"
          : "bg-neutral-950/60 border-white/5"
      }`}>
        <span className="text-lg leading-none">🪙</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-black tabular-nums ${boostActive ? "text-amber-400" : "text-amber-300"}`}>
            {display.toLocaleString()}
          </p>
          <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">
            {boostActive ? "boost 2× ativo!" : "DevCoins"}
          </p>
        </div>
      </div>

      {/* Badge de pendentes */}
      {pendingCount > 0 && (
        <button
          onClick={onClickPending}
          className="w-full flex items-center justify-between px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:border-emerald-500/60 hover:bg-emerald-500/15 transition-all group"
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
            🎁 {pendingCount} para resgatar
          </span>
          <span className="text-[9px] font-black text-emerald-400">+{pendingCoins}</span>
        </button>
      )}
    </div>
  );
}

export default memo(CoinWidget);
