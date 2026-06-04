// ─── Dino Runner — Jogo do Dinossauro | DEVGENIUS V12 ────────────────────────
import React, { useEffect, useRef, useState, useCallback } from "react";
import { User } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, RotateCcw } from "lucide-react";
import { useRewards } from "../context/RewardsContext";
import { LevelChip, useLevelInfo } from "./LevelBadge";

function DinoEntryLevel({ username }: { username: string }) {
  const info = useLevelInfo(username);
  if (!info) return null;
  return <LevelChip level={info.level} title={info.title} />;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const W = 800;         // largura do canvas
const H = 300;         // altura do canvas
const GROUND_Y = 240;  // linha do chão (Y do topo)
const DINO_W   = 50;   // largura do personagem
const DINO_H   = 50;   // altura do personagem
const DINO_X   = 90;   // posição X fixa do personagem
const GRAVITY   = 1.1;
const JUMP_FORCE = -18;
const BASE_SPEED  = 6;
const SPEED_INC   = 0.4;  // aumento a cada 100 pontos

interface Obstacle {
  x: number;
  w: number;
  h: number;
  type: "single" | "double" | "tall";
}

interface Cloud {
  x: number;
  y: number;
  w: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function DinoRunner({ user }: { user: User | null }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const logoRef     = useRef<HTMLImageElement | null>(null);

  // Refs do estado do jogo (evita stale closures)
  const dinoYRef    = useRef(GROUND_Y - DINO_H);  // Y do topo do dino
  const dinoVRef    = useRef(0);
  const onGroundRef = useRef(true);
  const obsRef      = useRef<Obstacle[]>([]);
  const cloudsRef   = useRef<Cloud[]>([]);
  const scoreRef    = useRef(0);
  const speedRef    = useRef(BASE_SPEED);
  const frameRef    = useRef(0);
  const groundOffRef = useRef(0);  // offset do chão para scroll
  const phaseRef    = useRef<"idle" | "playing" | "dead">("idle");
  const legPhaseRef = useRef(0);   // animação de corrida

  // Estado React
  const [phase, setPhase]         = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore]         = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("dino_best") || "0"));
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loopKey, setLoopKey]     = useState(0);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : "Jogador";

  // ── Carrega logo ─────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.src = "/logo.png";
    img.onload = () => { logoRef.current = img; };
  }, []);

  // ── Carrega leaderboard ───────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/games/dino/leaderboard");
      setLeaderboard(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchLeaderboard(); }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    dinoYRef.current    = GROUND_Y - DINO_H;
    dinoVRef.current    = 0;
    onGroundRef.current = true;
    obsRef.current      = [];
    cloudsRef.current   = [
      { x: 200, y: 40, w: 90 },
      { x: 500, y: 60, w: 70 },
      { x: 720, y: 30, w: 100 },
    ];
    scoreRef.current    = 0;
    speedRef.current    = BASE_SPEED;
    frameRef.current    = 0;
    groundOffRef.current = 0;
    legPhaseRef.current = 0;
    phaseRef.current    = "idle";
    setPhase("idle");
    setScore(0);
    setSubmitted(false);
  }, []);

  // ── Inicia ────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current); // cancela loop anterior
    resetGame();
    phaseRef.current = "playing";
    setPhase("playing");
    setLoopKey(k => k + 1); // força novo loop
  }, [resetGame]);

  // ── Pular ─────────────────────────────────────────────────────────────────
  const jump = useCallback(() => {
    if (phaseRef.current === "dead") return;
    if (phaseRef.current === "idle") { startGame(); return; }
    if (onGroundRef.current) {
      dinoVRef.current    = JUMP_FORCE;
      onGroundRef.current = false;
    }
  }, [startGame]);

  // ── Envia pontuação ───────────────────────────────────────────────────────
  const { claimEvent } = useRewards();
  const submitScore = useCallback(async (finalScore: number) => {
    if (finalScore === 0) return;
    try {
      await fetch("/api/games/dino/score", {
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

      // ── Milestones de moedas ──────────────────────────────────────────
      if (user) {
        const key = `dino_claimed_${user.username}`;
        const claimed: number[] = JSON.parse(localStorage.getItem(key) || "[]");
        const milestones = [{ pts: 500, coins: 15 }, { pts: 1500, coins: 30 }, { pts: 3000, coins: 60 }];
        for (const m of milestones) {
          if (finalScore >= m.pts && !claimed.includes(m.pts)) {
            await claimEvent(`dino_milestone:${m.pts}`, m.coins, { score: finalScore });
            claimed.push(m.pts);
          }
        }
        localStorage.setItem(key, JSON.stringify(claimed));
      }
    } catch {}
  }, [displayName, user, fetchLeaderboard, claimEvent]);

  // ── Game Loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function spawnObstacle() {
      const types: Obstacle["type"][] = ["single", "single", "double", "tall"];
      const t = types[Math.floor(Math.random() * types.length)];
      let w = 28, h = 52;
      if (t === "double") { w = 55; }
      if (t === "tall")   { h = 72; }
      obsRef.current.push({ x: W + 20, w, h, type: t });
    }

    function checkCollision(): boolean {
      const dTop  = dinoYRef.current;
      const dBot  = dTop + DINO_H;
      const dLeft = DINO_X + 6;
      const dRight = DINO_X + DINO_W - 6;
      for (const o of obsRef.current) {
        const oTop  = GROUND_Y - o.h;
        const oLeft = o.x + 4;
        const oRight = o.x + o.w - 4;
        if (dRight > oLeft && dLeft < oRight && dBot > oTop) return true;
      }
      return false;
    }

    function drawBackground() {
      // Gradiente de fundo
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,   "#03070f");
      grad.addColorStop(0.7, "#050d20");
      grad.addColorStop(1,   "#071530");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    function drawClouds() {
      cloudsRef.current.forEach(c => {
        ctx.fillStyle = "rgba(6,182,212,0.06)";
        ctx.beginPath();
        ctx.ellipse(c.x,       c.y,      c.w / 2,     14, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x - 20,  c.y + 5,  c.w / 3.5,   12, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 22,  c.y + 5,  c.w / 3,     10, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawGround() {
      // Linha do chão
      const lineGrad = ctx.createLinearGradient(0, GROUND_Y, W, GROUND_Y);
      lineGrad.addColorStop(0,   "rgba(6,182,212,0)");
      lineGrad.addColorStop(0.3, "rgba(6,182,212,0.5)");
      lineGrad.addColorStop(0.7, "rgba(6,182,212,0.5)");
      lineGrad.addColorStop(1,   "rgba(6,182,212,0)");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, GROUND_Y, W, 2);

      // Solo
      ctx.fillStyle = "rgba(6,182,212,0.04)";
      ctx.fillRect(0, GROUND_Y + 2, W, H - GROUND_Y - 2);

      // Linhas do chão scrolling
      ctx.strokeStyle = "rgba(6,182,212,0.10)";
      ctx.lineWidth = 1;
      const step = 50;
      const off = groundOffRef.current % step;
      for (let x = -off; x < W + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 2);
        ctx.lineTo(x - 25, H);
        ctx.stroke();
      }
    }

    function drawObstacles() {
      obsRef.current.forEach(o => {
        const oY = GROUND_Y - o.h;

        // Sombra
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(o.x + 4, GROUND_Y, o.w - 4, 4);

        // Corpo do cato
        const grad = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
        grad.addColorStop(0,   "#064e3b");
        grad.addColorStop(0.4, "#065f46");
        grad.addColorStop(1,   "#022c22");
        ctx.fillStyle = grad;

        if (o.type === "double") {
          // Dois cactos lado a lado
          ctx.beginPath();
          ctx.roundRect(o.x,      oY,          22, o.h, [4,4,2,2]);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(o.x + 28, oY + 10,     22, o.h - 10, [4,4,2,2]);
          ctx.fill();
          // Braços
          ctx.fillStyle = "#065f46";
          ctx.roundRect(o.x - 8,  oY + 16, 14, 8, 3); ctx.fill();
          ctx.roundRect(o.x + 16, oY + 16, 14, 8, 3); ctx.fill();
        } else {
          // Cacto único
          ctx.beginPath();
          ctx.roundRect(o.x, oY, o.w, o.h, [5, 5, 2, 2]);
          ctx.fill();
          // Braços laterais
          ctx.fillStyle = "#065f46";
          ctx.beginPath(); ctx.roundRect(o.x - 10, oY + o.h * 0.3, 14, 8, 3); ctx.fill();
          ctx.beginPath(); ctx.roundRect(o.x + o.w - 4, oY + o.h * 0.4, 14, 8, 3); ctx.fill();
        }

        // Borda ciana sutil
        ctx.strokeStyle = "rgba(6,182,212,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(o.x, oY, o.type === "double" ? o.w : o.w, o.h);
        ctx.stroke();
      });
    }

    function drawDino(y: number, onGround: boolean) {
      const x = DINO_X;
      ctx.save();

      // Sombra no chão
      if (onGround) {
        ctx.fillStyle = "rgba(6,182,212,0.15)";
        ctx.beginPath();
        ctx.ellipse(x + DINO_W / 2, GROUND_Y + 4, DINO_W / 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glow
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur  = phaseRef.current === "playing" ? 20 : 8;

      // Animação de pernas (quando no chão)
      const legOff = onGround ? Math.sin(legPhaseRef.current * 0.4) * 5 : 0;
      const tiltAngle = onGround ? 0 : Math.max(-0.2, Math.min(0.3, dinoVRef.current * 0.02));

      ctx.translate(x + DINO_W / 2, y + DINO_H / 2);
      ctx.rotate(tiltAngle);

      // Clip circular para a logo
      ctx.beginPath();
      ctx.arc(0, 0, DINO_W / 2, 0, Math.PI * 2);
      ctx.clip();

      if (logoRef.current) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(-DINO_W / 2, -DINO_H / 2, DINO_W, DINO_H);
        ctx.drawImage(logoRef.current, -DINO_W / 2, -DINO_H / 2, DINO_W, DINO_H);
      } else {
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.arc(0, 0, DINO_W / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Borda ciana
      ctx.save();
      ctx.translate(x + DINO_W / 2, y + DINO_H / 2);
      ctx.rotate(tiltAngle);
      ctx.beginPath();
      ctx.arc(0, 0, DINO_W / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6,182,212,0.9)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // Poeira ao correr (partículas)
      if (onGround && phaseRef.current === "playing") {
        for (let i = 0; i < 3; i++) {
          const px = x - 5 + Math.sin(legPhaseRef.current * 0.6 + i * 2) * 12;
          const py = GROUND_Y + 2 + i * 2;
          const alpha = 0.12 - i * 0.03;
          ctx.fillStyle = `rgba(6,182,212,${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 4 - i, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawScore(s: number, speed: number) {
      ctx.textAlign = "right";
      ctx.shadowColor = "rgba(6,182,212,0.8)";
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = "#fff";
      ctx.font        = "bold 36px 'Segoe UI', sans-serif";
      ctx.fillText(String(s).padStart(5, "0"), W - 20, 48);
      ctx.font      = "bold 10px monospace";
      ctx.fillStyle = "rgba(6,182,212,0.7)";
      ctx.fillText("DINO CODE", W - 20, 64);
      ctx.textAlign = "left";
      ctx.font      = "bold 9px monospace";
      ctx.fillStyle = "rgba(6,182,212,0.4)";
      ctx.fillText(`VEL: ${speed.toFixed(1)}x`, 14, 20);
      ctx.fillText(`BEST: ${bestScore}`, 14, 34);
      ctx.shadowBlur = 0;
    }

    function loop() {
      frameRef.current++;
      const f = phaseRef.current;

      if (f === "playing") {
        legPhaseRef.current++;
        groundOffRef.current += speedRef.current;

        // Física do dino
        dinoVRef.current    += GRAVITY;
        dinoYRef.current    += dinoVRef.current;

        // Chão
        if (dinoYRef.current >= GROUND_Y - DINO_H) {
          dinoYRef.current    = GROUND_Y - DINO_H;
          dinoVRef.current    = 0;
          onGroundRef.current = true;
        }

        // Nuvens scrolling
        cloudsRef.current.forEach(c => { c.x -= speedRef.current * 0.3; });
        cloudsRef.current = cloudsRef.current.filter(c => c.x > -150);
        if (Math.random() < 0.005) {
          cloudsRef.current.push({ x: W + 50, y: 20 + Math.random() * 60, w: 60 + Math.random() * 60 });
        }

        // Obstáculos
        obsRef.current.forEach(o => { o.x -= speedRef.current; });
        obsRef.current = obsRef.current.filter(o => o.x > -80);

        // Spawn de obstáculos
        const lastObs = obsRef.current[obsRef.current.length - 1];
        const minDist = Math.max(280, 500 - scoreRef.current * 0.3);
        if (!lastObs || lastObs.x < W - minDist) spawnObstacle();

        // Pontuação
        scoreRef.current = Math.floor(frameRef.current / 6);
        setScore(scoreRef.current);

        // Aumento de velocidade
        speedRef.current = BASE_SPEED + SPEED_INC * Math.floor(scoreRef.current / 100);
        speedRef.current = Math.min(speedRef.current, 14);

        // Colisão
        if (checkCollision()) {
          phaseRef.current    = "dead";
          setPhase("dead");
          const final = scoreRef.current;
          if (final > bestScore) {
            setBestScore(final);
            localStorage.setItem("dino_best", String(final));
          }
          submitScore(final);
          return;
        }
      }

      // ── Render ────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      drawBackground();
      drawClouds();
      drawGround();
      drawObstacles();
      drawDino(dinoYRef.current, onGroundRef.current);

      if (f === "playing") {
        drawScore(scoreRef.current, speedRef.current);
      }

      if (f === "idle") {
        // Dino no idle (anima suavemente)
        dinoYRef.current = GROUND_Y - DINO_H + Math.sin(frameRef.current * 0.06) * 5;
        drawDino(dinoYRef.current, false);
        ctx.textAlign = "center";
        ctx.font      = "bold 30px 'Segoe UI', sans-serif";
        ctx.fillStyle = "#06b6d4";
        ctx.shadowColor = "#06b6d4"; ctx.shadowBlur = 18;
        ctx.fillText("DINO CODE", W / 2, 70);
        ctx.shadowBlur = 0;
        ctx.font      = "bold 13px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("Espaço ou clique para correr!", W / 2, 100);
        drawScore(0, BASE_SPEED);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [bestScore, submitScore, loopKey]);

  // ── Teclado ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
      if (e.code === "KeyR" && phaseRef.current !== "playing") {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump, startGame]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h2 className="text-5xl font-black tracking-tighter uppercase">
          DINO <span className="text-cyan-400">CODE</span>
        </h2>
        <p className="text-neutral-500 font-medium">Desvie dos cactos · velocidade aumenta a cada 100 pontos · pontuação global</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* Canvas + overlays */}
        <div className="relative flex-shrink-0" style={{ width: W, height: H }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={jump}
            className="rounded-3xl cursor-pointer select-none block"
            style={{ boxShadow: "0 0 60px rgba(6,182,212,0.12), 0 20px 40px rgba(0,0,0,0.8)" }}
          />

          {/* Botão Reiniciar (durante o jogo e idle) */}
          {(phase === "playing" || phase === "idle") && (
            <button
              onClick={e => { e.stopPropagation(); startGame(); }}
              title="Reiniciar (R)"
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/80 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:border-white/20 transition-all backdrop-blur-sm"
            >
              <RotateCcw className="w-3 h-3" /> R
            </button>
          )}

          {/* Game Over overlay */}
          <AnimatePresence>
            {phase === "dead" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl"
                style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
              >
                <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="text-center space-y-5">
                  <p className="text-red-400 font-black text-2xl uppercase tracking-widest">GAME OVER</p>
                  <p className="text-7xl font-black text-white">{score}</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">pontos</p>

                  {score > 0 && score === bestScore && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
                      className="flex items-center gap-2 justify-center px-5 py-2 bg-amber-500/20 border border-amber-500/40 rounded-2xl">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 font-black text-sm uppercase tracking-widest">Novo recorde!</span>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-black text-neutral-400 px-6">
                    <span>Atual: <span className="text-white">{score}</span></span>
                    <span>Recorde: <span className="text-cyan-400">{bestScore}</span></span>
                  </div>

                  {submitted && (
                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">✓ Pontuação enviada!</p>
                  )}

                  <div className="flex gap-3 justify-center">
                    <button onClick={startGame}
                      className="flex items-center gap-3 px-6 py-3 bg-cyan-500 text-neutral-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/30">
                      <RotateCcw className="w-4 h-4" /> Reiniciar
                    </button>
                    <button onClick={fetchLeaderboard}
                      className="px-6 py-3 bg-neutral-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neutral-700 transition-all">
                      Ranking
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Painel lateral: ranking */}
        <div className="space-y-4" style={{ width: 220 }}>
          <div className="bg-neutral-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="px-5 py-4 bg-neutral-950/60 border-b border-white/5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-white uppercase tracking-tight">Ranking</span>
            </div>
            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto scrollbar-visible">
              {leaderboard.length === 0 ? (
                <p className="text-center text-neutral-700 py-6 text-xs">Seja o primeiro!</p>
              ) : leaderboard.slice(0, 10).map((e, i) => {
                const medals = ["🥇","🥈","🥉"];
                return (
                  <div key={e.username} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/3">
                    <span className="text-sm w-7 text-center">
                      {i < 3 ? medals[i] : <span className="text-neutral-600 font-black text-xs">#{i+1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-neutral-300 truncate">{e.username}</p>
                      <DinoEntryLevel username={e.username} />
                    </div>
                    <p className={`font-black text-xs flex-shrink-0 ${i===0?"text-amber-400":i===1?"text-neutral-300":i===2?"text-amber-600":"text-neutral-500"}`}>
                      {e.score}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">CONTROLES</p>
            <div className="space-y-1 text-[11px] text-neutral-500">
              <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-neutral-800 rounded text-[9px] font-black text-neutral-400">ESPAÇO</kbd> Pular</div>
              <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-neutral-800 rounded text-[9px] font-black text-neutral-400">CLIQUE</kbd> Pular</div>
              <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-neutral-800 rounded text-[9px] font-black text-neutral-400">R</kbd> Reiniciar</div>
            </div>
            <div className="border-t border-white/5 pt-2 text-[10px] text-neutral-600 space-y-1">
              <p>🌵 Obstáculos variados</p>
              <p>🚀 +velocidade a cada 100pts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
