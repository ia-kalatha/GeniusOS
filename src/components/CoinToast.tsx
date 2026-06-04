// ─── CoinToastStack — notificações de moedas (contexto isolado) ──────────────
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useToastQueue } from "../context/RewardsContext";

export default function CoinToastStack() {
  const { queue, dismiss } = useToastQueue();

  return (
    <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {queue.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            onClick={() => dismiss(toast.id)}
            className={`relative flex items-center gap-3 px-5 py-3 bg-neutral-900 rounded-2xl shadow-2xl shadow-black/60 pointer-events-all cursor-pointer border overflow-hidden ${
              toast.redeemed ? "border-amber-500/30" : "border-emerald-500/30"
            }`}
          >
            <span className="text-xl leading-none">{toast.redeemed ? "🪙" : "🎁"}</span>
            <div>
              <p className={`text-sm font-black ${toast.redeemed ? "text-amber-400" : "text-emerald-400"}`}>
                +{toast.amount} DevCoins
              </p>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">
                {toast.redeemed ? "creditados!" : "disponível para resgatar"}
              </p>
            </div>
            <motion.div
              className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${toast.redeemed ? "bg-amber-500/60" : "bg-emerald-500/60"}`}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.3, ease: "linear" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
