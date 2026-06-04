// ─── RewardsView — Aba de Recompensas DevCoins ───────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { User } from "../App";
import { useRewards } from "../context/RewardsContext";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, History, Zap, CheckCircle2, Lock, Gift } from "lucide-react";
import { LevelCard, calcLevelClient } from "./LevelBadge";

interface RewardEvent {
  id: string;
  username: string;
  eventKey: string;
  coins: number;
  ts: number;
  status: "pending" | "redeemed";
}

const EVENT_LABELS: Record<string, string> = {
  trilha_perfect:       "Trilha concluída com 100%",
  provas_correct:       "Acertos em prova",
  collection_mark:      "Item marcado na coleção",
  project_complete:     "Projeto guiado concluído",
  ia_module_complete:   "Módulo IA aprendizado",
  code_lesson_complete: "Lição de código concluída",
  community_message:    "Mensagem na comunidade",
  dm_sent:              "Mensagem privada enviada",
  flappy_milestone:     "Milestone Flappy Code",
  dino_milestone:       "Milestone Dino Runner",
  flappy_rank1:         "1º no ranking Flappy",
  dino_rank1:           "1º no ranking Dino",
  login_streak:         "Login diário",
  coin_boost_24h:       "Boost 2× ativado",
};

const TYPE_COLORS: Record<string, string> = {
  theme:   "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:border-purple-500/50",
  badge:   "bg-amber-500/10  border-amber-500/20  text-amber-400  hover:border-amber-500/50",
  title:   "bg-cyan-500/10   border-cyan-500/20   text-cyan-400   hover:border-cyan-500/50",
  accent:  "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/50",
  session: "bg-blue-500/10   border-blue-500/20   text-blue-400   hover:border-blue-500/50",
  boost:   "bg-red-500/10    border-red-500/20    text-red-400    hover:border-red-500/50",
};

const EARN_TABLE = [
  {
    icon:"🎓", label:"Acerto em prova", xp:"2/questão", xpNum:2, type:"Repetível", eventPrefix:"provas_correct",
    desc:"Vá até a aba Provas & Testes, escolha uma trilha (Básico, Intermediário ou Pro) e responda as 30 questões. Cada acerto vale 2 moedas + 2 XP. Não há limite de tentativas — você pode repetir as provas para ganhar mais moedas.",
  },
  {
    icon:"🏆", label:"Trilha 100% (1ª vez)", xp:"50", xpNum:50, type:"Uma vez", eventPrefix:"trilha_perfect",
    desc:"Complete uma trilha de provas com 30 acertos em 30 questões (100% de aproveitamento) pela primeira vez. Cada trilha só pode ser conquistada uma vez. Existem 9 trilhas no total — estude bem antes de tentar!",
  },
  {
    icon:"⭐", label:"Marcar item na coleção", xp:"5", xpNum:5, type:"Uma vez/item", eventPrefix:"collection_mark",
    desc:"Acesse a aba Componentes ou Placas, abra qualquer item e clique no botão de coleção (ícone de check). Cada componente ou placa marcada pela primeira vez rende 5 moedas + 5 XP. Há dezenas de itens para coletar!",
  },
  {
    icon:"🔧", label:"Projeto guiado concluído", xp:"20", xpNum:20, type:"Uma vez/proj", eventPrefix:"project_complete",
    desc:"Dentro do modal de um componente ou placa, acesse a aba de Projetos Guiados e marque um projeto como concluído. Cada projeto concluído pela primeira vez rende 20 moedas + 20 XP. Há até 10 projetos por componente.",
  },
  {
    icon:"🤖", label:"Módulo IA aprendizado", xp:"30", xpNum:30, type:"Uma vez/mód", eventPrefix:"ia_module_complete",
    desc:"Acesse a aba Aprender IA no menu lateral. Leia o conteúdo de qualquer um dos 4 módulos (Fundamentos, ML, IA Generativa, Edge AI) e clique em Marcar Concluído ao terminar. Cada módulo vale 30 moedas + 30 XP.",
  },
  {
    icon:"💻", label:"Lição Base de Código", xp:"15", xpNum:15, type:"Uma vez/lição", eventPrefix:"code_lesson_complete",
    desc:"Vá até a aba Base de Código no menu lateral. Escolha uma linguagem (C++, JavaScript ou Python) e uma parte do módulo. Clique em Concluir Módulo ao terminar a leitura. Cada lição concluída rende 15 moedas + 15 XP.",
  },
  {
    icon:"📅", label:"Login diário (streak 1-6)", xp:"10", xpNum:10, type:"1×/dia", eventPrefix:"login_streak",
    desc:"Faça login no site todos os dias. Nos primeiros 6 dias consecutivos de login você ganha 10 moedas + 10 XP por dia. A recompensa aparece automaticamente no Histórico após o login — basta resgatar!",
  },
  {
    icon:"🔥", label:"Login diário (streak 7+)", xp:"25", xpNum:25, type:"1×/dia", eventPrefix:"login_streak",
    desc:"Mantenha seu streak de login por 7 dias ou mais consecutivos. A partir do 7º dia (e a cada 7 dias), o bônus de login aumenta para 25 moedas + 25 XP. Não perca um dia ou o streak reinicia!",
  },
  {
    icon:"💬", label:"Mensagem no chat", xp:"3", xpNum:3, type:"Cap 5/dia", eventPrefix:"community_message",
    desc:"Acesse a aba Comunidade e envie mensagens no chat público. Cada mensagem enviada rende 3 moedas + 3 XP, com limite de 5 mensagens por dia (máximo 15 moedas/dia). Interaja com outros makers!",
  },
  {
    icon:"🐦", label:"Flappy ≥ 10 pts", xp:"15", xpNum:15, type:"Uma vez", eventPrefix:"flappy_milestone:10",
    desc:"Vá até a aba Games e jogue o Flappy Code. Alcance 10 pontos em uma única partida para desbloquear esta conquista. Use Espaço ou clique para pular. O personagem é o logo do DevGenius — bom voo!",
  },
  {
    icon:"🐦", label:"Flappy ≥ 25 pts", xp:"30", xpNum:30, type:"Uma vez", eventPrefix:"flappy_milestone:25",
    desc:"No Flappy Code, alcance 25 pontos em uma partida. A velocidade aumenta progressivamente — você precisará de reflexos rápidos. Dica: mantenha o personagem no centro e antecipe os canos.",
  },
  {
    icon:"🐦", label:"Flappy ≥ 50 pts", xp:"60", xpNum:60, type:"Uma vez", eventPrefix:"flappy_milestone:50",
    desc:"O desafio máximo do Flappy Code: 50 pontos em uma partida. Neste nível a velocidade é alta e os canos surgem rapidamente. Apenas os melhores jogadores alcançam esta conquista!",
  },
  {
    icon:"🦕", label:"Dino ≥ 500 pts", xp:"15", xpNum:15, type:"Uma vez", eventPrefix:"dino_milestone:500",
    desc:"Acesse a aba Games e jogue o Dino Runner. Alcance 500 pontos sem colidir com cactos. Pressione Espaço ou clique para pular. O dinossauro é o logo do DevGenius correndo pelo deserto digital.",
  },
  {
    icon:"🦕", label:"Dino ≥ 1500 pts", xp:"30", xpNum:30, type:"Uma vez", eventPrefix:"dino_milestone:1500",
    desc:"No Dino Runner, alcance 1.500 pontos. A velocidade aumenta a cada 100 pontos, tornando os obstáculos mais difíceis de desviar. Fique atento aos cactos duplos e altos!",
  },
  {
    icon:"🦕", label:"Dino ≥ 3000 pts", xp:"60", xpNum:60, type:"Uma vez", eventPrefix:"dino_milestone:3000",
    desc:"O desafio supremo do Dino Runner: 3.000 pontos. Neste nível a velocidade é extrema. Concentração total necessária. Conquista reservada para os verdadeiros corredores do DevGenius!",
  },
  {
    icon:"👑", label:"#1 no ranking de jogo", xp:"25", xpNum:25, type:"Por submissão", eventPrefix:"flappy_rank1",
    desc:"Alcance o 1º lugar no ranking global do Flappy Code ou Dino Runner. Jogue e supere todos os outros jogadores. O ranking é atualizado em tempo real — cada partida é uma chance de ser o número 1!",
  },
];

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "agora";
  if (s < 3600)  return `${Math.floor(s/60)}min atrás`;
  if (s < 86400) return `${Math.floor(s/3600)}h atrás`;
  return new Date(ts).toLocaleDateString("pt-BR");
}

function eventLabel(key: string): string {
  const prefix = key.split(":")[0];
  return EVENT_LABELS[prefix] || key;
}

export default function RewardsView({ user }: { user: User | null }) {
  const { balance, purchasedItems, boostActive, catalog, purchaseReward, fetchBalance, redeemEvent,
          pendingCount, pendingCoins, refreshPending } = useRewards();
  const [tab, setTab]             = useState<"loja" | "ganhar" | "historico">("loja");
  const [events, setEvents]       = useState<RewardEvent[]>([]);
  const [buying, setBuying]       = useState<string | null>(null);
  const [buyMsg, setBuyMsg]       = useState<string | null>(null);
  const [buyMsgOk, setBuyMsgOk]   = useState(true);
  const [redeeming, setRedeeming]         = useState<string | null>(null);
  const [expandedMission, setExpandedMission] = useState<number | null>(null);

  const loadEvents = useCallback(() => {
    if (!user) return;
    fetch(`/api/rewards/events/${user.username}?limit=50`)
      .then(r => r.json()).then(setEvents).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (tab === "historico" || tab === "ganhar") loadEvents();
  }, [tab, loadEvents]);

  // Conjunto de prefixos de eventos já feitos (pending ou redeemed)
  const doneEventKeys = new Set(
    events.map(e => e.eventKey.split(":").slice(0, 2).join(":"))
  );

  const handleBuy = async (rewardId: string, cost: number) => {
    if (!user) return;
    if (balance < cost) {
      setBuyMsg("Saldo insuficiente!"); setBuyMsgOk(false);
      setTimeout(() => setBuyMsg(null), 2500); return;
    }
    setBuying(rewardId);
    const result = await purchaseReward(rewardId);
    setBuying(null);
    if (result.ok) {
      setBuyMsg("🎉 Recompensa desbloqueada!"); setBuyMsgOk(true);
      if (user) fetchBalance(user.username);
    } else {
      setBuyMsg(result.error || "Erro ao comprar"); setBuyMsgOk(false);
    }
    setTimeout(() => setBuyMsg(null), 3000);
  };

  const handleRedeem = async (eventId: string) => {
    setRedeeming(eventId);
    const result = await redeemEvent(eventId);
    setRedeeming(null);
    if (result.ok) {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: "redeemed" } : e));
    }
  };

  const handleRedeemAll = async () => {
    const pending = events.filter(e => e.status === "pending");
    for (const evt of pending) {
      setRedeeming(evt.id);
      const result = await redeemEvent(evt.id);
      if (result.ok) {
        setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, status: "redeemed" } : e));
      }
      await new Promise(r => setTimeout(r, 100));
    }
    setRedeeming(null);
    refreshPending();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">

      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-5xl font-black tracking-tighter uppercase">
          DEV<span className="text-amber-400">COINS</span>
        </h2>
        <p className="text-neutral-500 font-medium">Ganhe moedas completando atividades · resgate no histórico · troque por recompensas</p>

        {/* Saldo + badge de pendentes */}
        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
          <div className={`flex items-center gap-4 px-8 py-5 rounded-3xl border-2 shadow-2xl transition-all ${
            boostActive
              ? "bg-amber-500/10 border-amber-500/40 shadow-amber-500/10"
              : "bg-neutral-900/60 border-white/10"
          }`}>
            <span className="text-4xl">🪙</span>
            <div className="text-left">
              <p className="text-4xl font-black text-amber-400 tabular-nums">{balance.toLocaleString()}</p>
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                DevCoins {boostActive && <span className="text-cyan-400 ml-1">· BOOST 2× ATIVO</span>}
              </p>
            </div>
          </div>

          {/* Badge de pendentes — clica para ir ao histórico */}
          {pendingCount > 0 && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={() => setTab("historico")}
              className="flex flex-col items-center gap-1 px-5 py-4 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-3xl hover:border-emerald-500/70 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-black text-emerald-400">+{pendingCoins}</span>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                {pendingCount} para resgatar
              </p>
            </motion.button>
          )}
        </div>
      </div>

      {/* Feedback de compra */}
      <AnimatePresence>
        {buyMsg && (
          <motion.div initial={{y:-20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-20,opacity:0}}
            className={`text-center py-3 rounded-2xl font-black text-sm uppercase tracking-widest ${
              buyMsgOk
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
            {buyMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex bg-neutral-900 border border-white/5 p-1.5 rounded-2xl gap-1.5 w-fit mx-auto">
        {([
          { id:"loja",      label:"🛒 Loja" },
          { id:"ganhar",    label:"⚡ Missões & XP" },
          { id:"historico", label: pendingCount > 0 ? `🎁 Histórico (${pendingCount})` : "📋 Histórico" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t.id
                ? t.id === "historico" && pendingCount > 0
                  ? "bg-emerald-500 text-neutral-950 shadow-lg"
                  : "bg-amber-500 text-neutral-950 shadow-lg"
                : t.id === "historico" && pendingCount > 0
                ? "text-emerald-400 hover:text-white"
                : "text-neutral-500 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LOJA ── */}
      {tab === "loja" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {catalog.map(reward => {
            const owned     = purchasedItems.includes(reward.id);
            const canAfford = balance >= reward.cost;
            const isLoading = buying === reward.id;
            const color     = TYPE_COLORS[reward.type] || TYPE_COLORS.theme;
            return (
              <motion.div key={reward.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
                className={`relative border rounded-[2rem] p-6 space-y-4 transition-all ${color} ${
                  owned ? "opacity-80" : canAfford ? "cursor-pointer" : "opacity-60"
                }`}>
                {owned && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="text-4xl">{reward.icon}</div>
                <div>
                  <p className="font-black text-lg leading-tight text-white">{reward.name}</p>
                  <p className="text-[11px] font-medium leading-relaxed opacity-70 mt-1">{reward.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🪙</span>
                    <span className="font-black text-lg text-amber-400">{reward.cost}</span>
                  </div>
                  <button
                    onClick={() => !owned && handleBuy(reward.id, reward.cost)}
                    disabled={owned || isLoading || !canAfford || !user}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      owned
                        ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                        : !canAfford || !user
                        ? "bg-white/5 text-neutral-600 cursor-not-allowed"
                        : "bg-amber-500 text-neutral-950 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
                    }`}
                  >
                    {isLoading ? "..." : owned ? "✓ Adquirido" : !user ? <Lock className="w-3 h-3 mx-auto" /> : "Comprar"}
                  </button>
                </div>
              </motion.div>
            );
          })}
          {!user && (
            <div className="col-span-full text-center py-12 text-neutral-600">
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm">Faça login para acessar a loja</p>
            </div>
          )}
        </div>
      )}

      {/* ── COMO GANHAR ── */}
      {tab === "ganhar" && (
        <div className="space-y-4">

          {/* Card de nível atual */}
          {user && <LevelCard username={user.username} />}

          {/* Explicação */}
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
            <p className="text-purple-400 font-black text-sm mb-1">⚡ XP = Experiência</p>
            <p className="text-neutral-500 text-[11px]">
              Ao resgatar moedas no Histórico, você ganha a mesma quantidade em <strong className="text-purple-300">XP</strong>.
              XP sobe seu nível de perfil permanentemente — nunca diminui.
            </p>
          </div>

          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 pl-1">
            Missões disponíveis — XP ganho ao resgatar
          </p>

          {EARN_TABLE.map((row, i) => {
            const done     = user && doneEventKeys.has(row.eventPrefix);
            const expanded = expandedMission === i;
            return (
              <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                className={`border rounded-2xl overflow-hidden transition-all cursor-pointer ${
                  expanded
                    ? done ? "bg-emerald-500/8 border-emerald-500/30" : "bg-purple-500/5 border-purple-500/30"
                    : done ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                           : "bg-neutral-900/40 border-white/5 hover:border-purple-500/20"
                }`}
                onClick={() => setExpandedMission(expanded ? null : i)}
              >
                {/* ── Linha principal ── */}
                <div className="flex items-center gap-4 p-4">
                  <span className="text-2xl flex-shrink-0">{row.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm ${done ? "text-emerald-300" : "text-white"}`}>{row.label}</p>
                    <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">{row.type}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`font-black text-sm ${done ? "text-emerald-400" : "text-purple-400"}`}>+{row.xp} XP</p>
                      <p className="text-[8px] text-neutral-700 font-bold uppercase">experiência</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-amber-400">+{row.xp}</p>
                      <p className="text-[8px] text-neutral-700 font-bold uppercase">moedas</p>
                    </div>
                    {done ? (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">✓ Feito</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-neutral-500 text-[10px] font-black">{expanded ? "▲" : "▼"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Texto explicativo — expande ao clicar ── */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-6 pb-5 border-t ${done ? "border-emerald-500/10" : "border-purple-500/10"}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 mt-3 ${done ? "text-emerald-500" : "text-purple-400"}`}>
                          📋 Como completar esta missão
                        </p>
                        <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                          {row.desc}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === "historico" && (
        <div className="space-y-3">
          {!user ? (
            <div className="text-center py-16 text-neutral-700">
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm">Faça login para ver o histórico</p>
            </div>
          ) : (
            <>
              {/* Banner resgatar todos */}
              {pendingCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl gap-4"
                >
                  <div>
                    <p className="font-black text-emerald-400 text-base">
                      🎁 {pendingCount} recompensa{pendingCount > 1 ? "s" : ""} aguardando resgate
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                      Total disponível: +{pendingCoins} DevCoins
                    </p>
                  </div>
                  <button
                    onClick={handleRedeemAll}
                    disabled={redeeming !== null}
                    className="flex-shrink-0 px-6 py-3 bg-emerald-500 text-neutral-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                  >
                    {redeeming ? "..." : "Resgatar Todos"}
                  </button>
                </motion.div>
              )}

              {events.length === 0 ? (
                <div className="text-center py-16 text-neutral-700">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-black uppercase tracking-widest text-sm">Nenhuma atividade registrada ainda</p>
                  <p className="text-[10px] mt-2">Complete atividades no site para ganhar suas primeiras moedas!</p>
                </div>
              ) : (
                events.map((e, i) => {
                  const isPending = e.status === "pending";
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`flex items-center gap-4 p-4 border rounded-2xl transition-all ${
                        isPending
                          ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                          : "bg-neutral-900/30 border-white/5"
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{isPending ? "🎁" : "🪙"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white truncate">{eventLabel(e.eventKey)}</p>
                        <p className="text-[9px] text-neutral-600 font-medium">{timeAgo(e.ts)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className={`font-black text-base ${isPending ? "text-emerald-400" : "text-amber-400"}`}>
                          +{e.coins}
                        </p>
                        {isPending ? (
                          <button
                            onClick={() => handleRedeem(e.id)}
                            disabled={redeeming !== null}
                            className="px-4 py-1.5 bg-emerald-500 text-neutral-950 rounded-lg font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-60"
                          >
                            {redeeming === e.id ? "..." : "Resgatar"}
                          </button>
                        ) : (
                          <span className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-neutral-600">
                            ✓ Resgatado
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
