// ─── Flappy Code — Jogo estilo Flappy Bird | DEVGENIUS V12 ───────────────────
import React, { useEffect, useRef, useState, useCallback } from "react";
import { User } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, RotateCcw, Play, ChevronRight } from "lucide-react";
import { useRewards } from "../context/RewardsContext";
import { LevelChip, useLevelInfo } from "./LevelBadge";

function EntryLevel({ username }: { username: string }) {
  const info = useLevelInfo(username);
  if (!info) return <p className="text-[9px] text-neutral-600 font-medium">—</p>;
  return <div className="mt-0.5"><LevelChip level={info.level} title={info.title} /></div>;
}

// ─── Constantes do jogo ───────────────────────────────────────────────────────
const W = 480;       // largura do canvas
const H = 640;       // altura do canvas
const BIRD_R = 24;   // raio do personagem (circulo)
const PIPE_W = 62;   // largura dos canos
const GAP   = 175;   // espaço entre cano superior e inferior
const GRAVITY = 0.52;
const FLAP_FORCE = -8.5;   // Pulo mais baixo (era -11)
const BASE_SPEED  = 2.8;   // velocidade inicial (px/frame)
const SPEED_INC   = 0.25;  // aumento de velocidade a cada 5 pontos
const PIPE_SPAWN_DIST = 220; // distância entre canos
const GROUND_H    = 80;    // altura do chão
const BIRD_X      = 120;   // posição X fixa do personagem

interface Pipe {
  x: number;
  topH: number;   // altura do cano superior
  passed: boolean;
}

interface Record {
  username: string;
  score: number;
  avatar: string | null;
  ts: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FlappyCode({ user }: { user: User | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const logoRef   = useRef<HTMLImageElement | null>(null);

  // Estado do jogo (refs para evitar stale closures na loop)
  const birdYRef  = useRef(H / 2);
  const birdVRef  = useRef(0);
  const pipesRef  = useRef<Pipe[]>([]);
  const scoreRef  = useRef(0);
  const speedRef  = useRef(BASE_SPEED);
  const frameRef  = useRef(0);
  const phaseRef  = useRef<"idle" | "playing" | "dead">("idle");
  const groundOff = useRef(0); // scroll do chão

  // Estado React para UI
  const [phase, setPhase]         = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore]         = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("flappy_best") || "0"));
  const [leaderboard, setLeaderboard] = useState<Record[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [loopKey, setLoopKey]     = useState(0); // incrementar força reinício do loop
  const { claimEvent } = useRewards();

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : "Jogador";

  // ── Carrega a logo ────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.src = "/logo.png";
    img.onload = () => { logoRef.current = img; };
  }, []);

  // ── Carrega leaderboard ───────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/games/flappy/leaderboard");
      setLeaderboard(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchLeaderboard(); }, []);

  // ── Reset do jogo ─────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    birdYRef.current  = H / 2;
    birdVRef.current  = 0;
    pipesRef.current  = [];
    scoreRef.current  = 0;
    speedRef.current  = BASE_SPEED;
    frameRef.current  = 0;
    groundOff.current = 0;
    phaseRef.current  = "idle";
    setPhase("idle");
    setScore(0);
    setSubmitted(false);
  }, []);

  // ── Inicia o jogo ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current); // cancela loop anterior
    resetGame();
    birdVRef.current = FLAP_FORCE * 0.65;
    phaseRef.current = "playing";
    setPhase("playing");
    setLoopKey(k => k + 1); // força novo loop via useEffect
  }, [resetGame]);

  // ── Ação de pular ─────────────────────────────────────────────────────────
  const flap = useCallback(() => {
    if (phaseRef.current === "dead") return;
    if (phaseRef.current === "idle") { startGame(); return; }
    birdVRef.current = FLAP_FORCE;
  }, [startGame]);

  // ── Envia pontuação ao servidor ───────────────────────────────────────────
  const submitScore = useCallback(async (finalScore: number) => {
    if (finalScore === 0) return;
    try {
      await fetch("/api/games/flappy/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: displayName,
          score:    finalScore,
          avatar:   user?.profileImage || null,
        }),
      });
      setSubmitted(true);
      fetchLeaderboard();

      // ── Milestones de moedas ────────────────────────────────────────
      if (user) {
        const key = `flappy_claimed_${user.username}`;
        const claimed: number[] = JSON.parse(localStorage.getItem(key) || "[]");
        const milestones = [{ pts: 10, coins: 15 }, { pts: 25, coins: 30 }, { pts: 50, coins: 60 }];
        for (const m of milestones) {
          if (finalScore >= m.pts && !claimed.includes(m.pts)) {
            await claimEvent(`flappy_milestone:${m.pts}`, m.coins, { score: finalScore });
            claimed.push(m.pts);
          }
        }
        localStorage.setItem(key, JSON.stringify(claimed));
      }
    } catch {}
  }, [displayName, user, fetchLeaderboard, claimEvent]);

  // ── Loop principal ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function spawnPipe() {
      const minH = 80, maxH = H - GROUND_H - GAP - 80;
      const topH = minH + Math.random() * (maxH - minH);
      pipesRef.current.push({ x: W + 20, topH, passed: false });
    }

    function checkCollision(birdY: number): boolean {
      // Chão e teto
      if (birdY + BIRD_R >= H - GROUND_H || birdY - BIRD_R <= 0) return true;
      // Canos
      for (const p of pipesRef.current) {
        const pLeft = p.x, pRight = p.x + PIPE_W;
        const bLeft = BIRD_X - BIRD_R, bRight = BIRD_X + BIRD_R;
        if (bRight > pLeft && bLeft < pRight) {
          // Colisão com cano superior
          if (birdY - BIRD_R < p.topH) return true;
          // Colisão com cano inferior
          if (birdY + BIRD_R > p.topH + GAP) return true;
        }
      }
      return false;
    }

    function drawBackground() {
      // Gradiente de fundo
      const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      grad.addColorStop(0,   "#02060f");
      grad.addColorStop(0.5, "#050d20");
      grad.addColorStop(1,   "#071530");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H - GROUND_H);

      // Estrelas/partículas de fundo
      ctx.fillStyle = "rgba(6,182,212,0.08)";
      for (let i = 0; i < 30; i++) {
        const x = ((i * 137 + frameRef.current * 0.05) % W);
        const y = (i * 71) % (H - GROUND_H);
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPipes(pipes: Pipe[]) {
      pipes.forEach(p => {
        // Gradiente dos canos
        const gradPipe = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        gradPipe.addColorStop(0,   "#064e3b");
        gradPipe.addColorStop(0.4, "#065f46");
        gradPipe.addColorStop(1,   "#022c22");

        // ── Cano superior ──
        ctx.fillStyle = gradPipe;
        ctx.beginPath();
        ctx.roundRect(p.x, 0, PIPE_W, p.topH - 10, [0, 0, 8, 8]);
        ctx.fill();
        // "Boca" do cano superior
        ctx.fillStyle = "#047857";
        ctx.beginPath();
        ctx.roundRect(p.x - 5, p.topH - 24, PIPE_W + 10, 24, 6);
        ctx.fill();
        // Borda brilhante
        ctx.strokeStyle = "rgba(6,182,212,0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Cano inferior ──
        const botY = p.topH + GAP;
        ctx.fillStyle = gradPipe;
        ctx.beginPath();
        ctx.roundRect(p.x, botY + 10, PIPE_W, H - GROUND_H - botY - 10, [8, 8, 0, 0]);
        ctx.fill();
        // "Boca" do cano inferior
        ctx.fillStyle = "#047857";
        ctx.beginPath();
        ctx.roundRect(p.x - 5, botY, PIPE_W + 10, 24, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(6,182,212,0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Brilho lateral dos canos
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(p.x + 6, 0, 8, p.topH - 10);
        ctx.fillRect(p.x + 6, botY + 10, 8, H - GROUND_H - botY - 10);
      });
    }

    function drawBird(birdY: number, vel: number) {
      ctx.save();
      ctx.translate(BIRD_X, birdY);
      // Rotação baseada na velocidade
      const rot = Math.max(-0.45, Math.min(1.2, vel * 0.06));
      ctx.rotate(rot);

      // Sombra/glow
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur  = phaseRef.current === "playing" ? 16 : 6;

      // Clip circular
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.clip();

      if (logoRef.current) {
        // Fundo do círculo
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(-BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
        // Logo
        ctx.drawImage(logoRef.current, -BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
      } else {
        // Fallback: círculo ciano com "DG"
        ctx.fillStyle = "#06b6d4";
        ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DG", 0, 0);
      }

      // Borda brilhante
      ctx.restore();
      ctx.save();
      ctx.translate(BIRD_X, birdY);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6,182,212,0.8)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    function drawGround() {
      // Solo
      ctx.fillStyle = "#0d1a0d";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

      // Linha de separação
      const lineGrad = ctx.createLinearGradient(0, H - GROUND_H, W, H - GROUND_H);
      lineGrad.addColorStop(0,   "rgba(6,182,212,0)");
      lineGrad.addColorStop(0.5, "rgba(6,182,212,0.6)");
      lineGrad.addColorStop(1,   "rgba(6,182,212,0)");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, H - GROUND_H, W, 2);

      // Linhas do chão (scrolling)
      ctx.strokeStyle = "rgba(6,182,212,0.12)";
      ctx.lineWidth = 1;
      const step = 40;
      const off = groundOff.current % step;
      for (let x = -off; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, H - GROUND_H + 2);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }

    function drawScore(s: number) {
      // Score principal
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(6,182,212,0.8)";
      ctx.shadowBlur  = 15;
      ctx.fillStyle   = "#fff";
      ctx.font        = "bold 54px 'Segoe UI', sans-serif";
      ctx.fillText(String(s), W / 2, 80);

      // Rótulo menor
      ctx.font      = "bold 11px monospace";
      ctx.fillStyle = "rgba(6,182,212,0.8)";
      ctx.fillText("FLAPPY CODE", W / 2, 105);
      ctx.shadowBlur = 0;
    }

    function drawHUD() {
      // Velocidade atual
      const spd = speedRef.current;
      ctx.textAlign = "left";
      ctx.font      = "bold 10px monospace";
      ctx.fillStyle = "rgba(6,182,212,0.5)";
      ctx.fillText(`VEL: ${spd.toFixed(1)}x`, 12, 22);
      // Melhor pontuação
      ctx.textAlign = "right";
      ctx.fillText(`BEST: ${bestScore}`, W - 12, 22);
    }

    function loop() {
      frameRef.current++;
      const f = phaseRef.current;

      // ── Física ──────────────────────────────────────────────────────────
      if (f === "playing") {
        birdVRef.current += GRAVITY;
        birdYRef.current += birdVRef.current;
        groundOff.current += speedRef.current;

        // Spawn de canos
        const pipes = pipesRef.current;
        if (pipes.length === 0 || pipes[pipes.length - 1].x < W - PIPE_SPAWN_DIST) {
          spawnPipe();
        }

        // Move canos
        pipes.forEach(p => { p.x -= speedRef.current; });

        // Remove canos fora da tela
        pipesRef.current = pipes.filter(p => p.x > -PIPE_W - 20);

        // Pontuação + aumento de velocidade
        pipes.forEach(p => {
          if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
            p.passed = true;
            scoreRef.current++;
            setScore(scoreRef.current);
            // Aumenta velocidade a cada 5 pontos
            if (scoreRef.current % 5 === 0) {
              speedRef.current = Math.min(BASE_SPEED + SPEED_INC * (scoreRef.current / 5), 9);
            }
          }
        });

        // Colisão
        if (checkCollision(birdYRef.current)) {
          phaseRef.current = "dead";
          setPhase("dead");
          const finalScore = scoreRef.current;
          // Salva melhor pontuação local
          if (finalScore > bestScore) {
            setBestScore(finalScore);
            localStorage.setItem("flappy_best", String(finalScore));
          }
          // Envia ao servidor
          submitScore(finalScore);
          return; // Para o loop
        }
      }

      // ── Render ──────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      drawBackground();
      drawPipes(pipesRef.current);
      drawBird(birdYRef.current, birdVRef.current);
      drawGround();
      if (f === "playing") {
        drawScore(scoreRef.current);
        drawHUD();
      }

      // ── Tela de idle ────────────────────────────────────────────────────
      if (f === "idle") {
        // Mensagem de início
        ctx.textAlign = "center";
        ctx.font      = "bold 28px 'Segoe UI', sans-serif";
        ctx.fillStyle = "#06b6d4";
        ctx.shadowColor = "#06b6d4"; ctx.shadowBlur = 20;
        ctx.fillText("FLAPPY CODE", W / 2, H / 2 - 60);
        ctx.shadowBlur = 0;
        ctx.font      = "bold 14px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("Clique ou espaço para voar", W / 2, H / 2 - 20);
        // Animação do personagem no idle (sobe e desce suavemente)
        birdYRef.current = H / 2 + Math.sin(frameRef.current * 0.05) * 14;
        drawBird(birdYRef.current, 0);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [bestScore, submitScore, loopKey]);

  // ── Eventos de teclado ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
      // R = reiniciar rapidamente
      if (e.code === "KeyR") {
        e.preventDefault();
        if (phaseRef.current === "dead") startGame();
        else if (phaseRef.current === "idle") startGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flap, startGame]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h2 className="text-5xl font-black tracking-tighter uppercase">
          FLAPPY <span className="text-cyan-400">CODE</span>
        </h2>
        <p className="text-neutral-500 font-medium">Use a logo do DevGenius para desviar dos canos · velocidade progressiva · pontuação global</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Canvas + overlay de game over ── */}
        <div className="relative flex-shrink-0" style={{ width: W, height: H }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={flap}
            className="rounded-3xl cursor-pointer select-none"
            style={{ display: "block", boxShadow: "0 0 60px rgba(6,182,212,0.15), 0 20px 40px rgba(0,0,0,0.8)" }}
          />

          {/* Botão Reiniciar — visível durante o jogo e no idle */}
          {(phase === "playing" || phase === "idle") && (
            <button
              onClick={e => { e.stopPropagation(); startGame(); }}
              title="Reiniciar (R)"
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/80 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:border-white/20 transition-all backdrop-blur-sm"
            >
              <RotateCcw className="w-3 h-3" /> R
            </button>
          )}

          {/* Overlay de Game Over */}
          <AnimatePresence>
            {phase === "dead" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl"
                style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
              >
                <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="text-center space-y-6 px-8">
                  <div>
                    <p className="text-red-400 font-black text-2xl uppercase tracking-widest mb-1">GAME OVER</p>
                    <p className="text-7xl font-black text-white">{score}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">pontos</p>
                  </div>

                  {score > 0 && score === bestScore && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
                      className="flex items-center gap-2 justify-center px-5 py-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 font-black text-sm uppercase tracking-widest">Novo recorde!</span>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-black text-neutral-400 px-4">
                    <span>Atual: <span className="text-white">{score}</span></span>
                    <span>Recorde: <span className="text-cyan-400">{bestScore}</span></span>
                  </div>

                  {submitted && (
                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                      ✓ Pontuação enviada ao ranking!
                    </p>
                  )}

                  <button onClick={startGame}
                    className="flex items-center gap-3 px-8 py-4 bg-cyan-500 text-neutral-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/30">
                    <RotateCcw className="w-5 h-5" /> JOGAR NOVAMENTE
                  </button>

                  <button onClick={() => { setShowBoard(true); fetchLeaderboard(); }}
                    className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest transition-colors">
                    Ver ranking global →
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Painel lateral: ranking ── */}
        <div className="flex-1 space-y-4">
          <div className="bg-neutral-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="px-5 py-4 bg-neutral-950/60 border-b border-white/5 flex items-center gap-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-white uppercase tracking-tight">Ranking Global</span>
              <button onClick={fetchLeaderboard}
                className="ml-auto text-[9px] text-neutral-600 hover:text-white uppercase font-black tracking-widest transition-colors">
                Atualizar
              </button>
            </div>

            <div className="p-3 space-y-1.5 max-h-96 overflow-y-auto scrollbar-visible">
              {leaderboard.length === 0 ? (
                <p className="text-center text-neutral-700 py-8 text-xs font-medium">Seja o primeiro a pontuar!</p>
              ) : leaderboard.map((entry, i) => {
                const isMe = entry.username === displayName;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <motion.div key={entry.username}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isMe
                        ? "bg-cyan-500/10 border border-cyan-500/20"
                        : i < 3
                        ? "bg-amber-500/5 border border-amber-500/10"
                        : "hover:bg-white/3"
                    }`}>
                    <span className="text-lg w-8 text-center flex-shrink-0">
                      {i < 3 ? medals[i] : <span className="text-neutral-600 font-black text-sm">#{i+1}</span>}
                    </span>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black overflow-hidden"
                      style={{ background: `${["#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444"][i%5]}30`,
                               border: `1.5px solid ${["#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444"][i%5]}40` }}>
                      {entry.avatar
                        ? <img src={entry.avatar} className="w-full h-full object-cover" />
                        : <span style={{ color: ["#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444"][i%5] }}>
                            {entry.username[0]?.toUpperCase()}
                          </span>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${isMe ? "text-cyan-400" : "text-white"}`}>
                        {entry.username} {isMe && <span className="text-[9px] text-cyan-600">(você)</span>}
                      </p>
                      <EntryLevel username={entry.username} />
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-black ${i === 0 ? "text-amber-400" : i === 1 ? "text-neutral-300" : i === 2 ? "text-amber-700" : "text-neutral-400"}`}>
                        {entry.score}
                      </p>
                      <p className="text-[8px] text-neutral-700 uppercase font-bold">pts</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">CONTROLES</p>
            <div className="space-y-1.5 text-[11px] text-neutral-500 font-medium">
              <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-neutral-800 rounded text-[9px] font-black text-neutral-400">ESPAÇO</kbd> Voar</div>
              <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-neutral-800 rounded text-[9px] font-black text-neutral-400">CLIQUE</kbd> Voar</div>
              <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-neutral-800 rounded text-[9px] font-black text-neutral-400">↑</kbd> Voar</div>
            </div>
            <div className="border-t border-white/5 pt-2 space-y-1 text-[10px] text-neutral-600">
              <p>🚀 Velocidade aumenta a cada 5 pontos</p>
              <p>🎯 Pontuação salva automaticamente</p>
              <p>🏆 Recorde visível na aba Comunidade</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
