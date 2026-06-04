// ─── LevelBadge — exibe nível e barra de progresso do usuário ────────────────
import React, { useEffect, useState } from "react";

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  xpForCurrent: number;
  xpForNext: number;
  progress: number;
}

const LEVEL_COLORS = [
  "#6b7280", // 1-5  cinza    Iniciante
  "#22d3ee", // 6-11 ciano    Aprendiz
  "#a855f7", // 12-17 roxo    Hacker
  "#3b82f6", // 18-23 azul    Desenvolvedor
  "#10b981", // 24-29 verde   Engenheiro
  "#f59e0b", // 30-35 âmbar   Arquiteto
  "#f43f5e", // 36-41 vermelho Mestre
  "#fbbf24", // 42+  ouro    Lenda
];

function levelColor(level: number): string {
  const idx = Math.min(Math.floor((level - 1) / 6), LEVEL_COLORS.length - 1);
  return LEVEL_COLORS[idx];
}

export function calcLevelClient(xp: number): LevelInfo {
  const level        = Math.floor(Math.sqrt(xp / 80)) + 1;
  const xpForCurrent = Math.pow(level - 1, 2) * 80;
  const xpForNext    = Math.pow(level, 2) * 80;
  const progress     = xpForNext > xpForCurrent
    ? Math.min((xp - xpForCurrent) / (xpForNext - xpForCurrent), 1)
    : 1;
  const TITLES = ["Iniciante","Aprendiz","Hacker","Desenvolvedor","Engenheiro","Arquiteto","Mestre","Lenda"];
  const title  = TITLES[Math.min(Math.floor((level - 1) / 6), TITLES.length - 1)];
  return { level, title, xp, xpForCurrent, xpForNext, progress };
}

// ── Componente compacto (inline, ex: ranking, admin) ─────────────────────────
export function LevelChip({ level, title }: { level: number; title: string }) {
  const color = levelColor(level);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border"
      style={{ color, borderColor: color + "44", backgroundColor: color + "11" }}
    >
      ⬡ {level} · {title}
    </span>
  );
}

// ── Componente completo com barra de progresso (ex: perfil) ─────────────────
export function LevelCard({ username }: { username: string }) {
  const [info, setInfo] = useState<LevelInfo | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profile/level/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(setInfo)
      .catch(() => {});
  }, [username]);

  if (!info) return null;
  const color = levelColor(info.level);
  const pct   = Math.round(info.progress * 100);
  const xpLeft = info.xpForNext - info.xp;

  return (
    <div
      className="p-5 rounded-2xl border space-y-3"
      style={{ borderColor: color + "33", backgroundColor: color + "0a" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black border-2"
            style={{ borderColor: color, backgroundColor: color + "22", color }}
          >
            {info.level}
          </div>
          <div>
            <p className="font-black text-white text-base uppercase tracking-tight">{info.title}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: color + "cc" }}>
              Nível {info.level} · {info.xp.toLocaleString()} XP
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Próximo nível</p>
          <p className="text-[10px] font-black text-neutral-400">+{xpLeft.toLocaleString()} XP</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-neutral-700">
          <span>{info.xpForCurrent.toLocaleString()} XP</span>
          <span>{pct}%</span>
          <span>{info.xpForNext.toLocaleString()} XP</span>
        </div>
      </div>
    </div>
  );
}

// ── Hook para buscar nível ────────────────────────────────────────────────────
export function useLevelInfo(username: string | undefined) {
  const [info, setInfo] = useState<LevelInfo | null>(null);
  useEffect(() => {
    if (!username) { setInfo(null); return; }
    fetch(`/api/profile/level/${encodeURIComponent(username)}`)
      .then(r => r.json()).then(setInfo).catch(() => {});
  }, [username]);
  return info;
}
