// Script de screenshots automático — DEVGENIUS V12
import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT = 'C:/Users/ferna/Downloads/devgenius/screenshots';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3000';

async function esperar(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fecharTimeline(page) {
  try {
    // Aguarda o botão VAMOS! aparecer e clica
    await page.waitForSelector('button', { timeout: 5000 });
    const btns = await page.$$('button');
    for (const btn of btns) {
      const txt = await btn.evaluate(el => el.textContent);
      if (txt && txt.includes('VAMOS')) { await btn.click(); break; }
    }
    await esperar(800);
  } catch {}
}

async function clicarTab(page, textoNav) {
  const btns = await page.$$('nav button, aside button');
  for (const btn of btns) {
    const txt = await btn.evaluate(el => el.textContent?.trim() || '');
    if (txt.toLowerCase().includes(textoNav.toLowerCase())) {
      await btn.click();
      await esperar(1200);
      return true;
    }
  }
  return false;
}

(async () => {
  console.log('Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-web-security'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await esperar(3000);
  await esperar(2000);
  await fecharTimeline(page);
  await esperar(1000);

  // ── IMAGEM 1: Controladoras / Tela Principal ─────────────────────────────
  console.log('📸 1/7 — Controladoras...');
  await page.screenshot({ path: join(OUT, '01_controladoras.png'), fullPage: false });

  // ── IMAGEM 2: Componentes ────────────────────────────────────────────────
  console.log('📸 2/7 — Componentes...');
  await clicarTab(page, 'Componentes');
  await esperar(1000);
  await page.screenshot({ path: join(OUT, '02_componentes.png'), fullPage: false });

  // ── IMAGEM 3: DevGenius IA ────────────────────────────────────────────────
  console.log('📸 3/7 — IA Chat...');
  await clicarTab(page, 'IA');
  await esperar(1200);
  await page.screenshot({ path: join(OUT, '03_ia_chat.png'), fullPage: false });

  // ── IMAGEM 4: Provas & Testes ─────────────────────────────────────────────
  console.log('📸 4/7 — Provas...');
  await clicarTab(page, 'Provas');
  await esperar(1200);
  await page.screenshot({ path: join(OUT, '04_provas.png'), fullPage: false });

  // ── IMAGEM 5: Base de Código (Python) ────────────────────────────────────
  console.log('📸 5/7 — Base de Código...');
  await clicarTab(page, 'Código');
  await esperar(1200);
  // Clica no botão Python
  try {
    const btns = await page.$$('button');
    for (const btn of btns) {
      const txt = await btn.evaluate(el => el.textContent?.trim() || '');
      if (txt.includes('PYTHON')) { await btn.click(); await esperar(600); break; }
    }
  } catch {}
  await page.screenshot({ path: join(OUT, '05_base_codigo_python.png'), fullPage: false });

  // ── IMAGEM 6: Projetos Prontos ────────────────────────────────────────────
  console.log('📸 6/7 — Projetos...');
  await clicarTab(page, 'Projetos');
  await esperar(1200);
  await page.screenshot({ path: join(OUT, '06_projetos.png'), fullPage: false });

  // ── IMAGEM 7: Resumo completo — cria HTML especial ───────────────────────
  console.log('📸 7/7 — Resumo completo...');
  const summaryHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#050a10;font-family:'Segoe UI',sans-serif;color:#fff;width:1440px;min-height:900px;overflow:hidden}
  .bg{position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,#06b6d415 0,transparent 70%)}
  .wrap{position:relative;z-index:1;padding:60px;display:grid;grid-template-rows:auto 1fr auto;gap:48px;min-height:900px}
  .header{text-align:center;space-y:12px}
  .logo-row{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}
  .logo{width:64px;height:64px;background:#0a0a0a;border:1px solid rgba(6,182,212,.3);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#06b6d4}
  h1{font-size:56px;font-weight:900;letter-spacing:-2px;line-height:1}
  h1 span{color:#06b6d4}
  .sub{font-size:18px;color:#6b7280;margin-top:12px;font-weight:500}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:24px;padding:28px;transition:all .2s}
  .card:hover{border-color:rgba(6,182,212,.3)}
  .icon{font-size:32px;margin-bottom:16px}
  .card h3{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
  .card p{font-size:12px;color:#6b7280;line-height:1.6}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin-top:12px}
  .new{background:rgba(6,182,212,.15);color:#06b6d4;border:1px solid rgba(6,182,212,.3)}
  .pro{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)}
  .footer{display:flex;align-items:center;justify-content:space-between;padding-top:24px;border-top:1px solid rgba(255,255,255,.05)}
  .tag{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#374151}
  .stats{display:flex;gap:32px}
  .stat{text-align:center}
  .stat .n{font-size:28px;font-weight:900;color:#06b6d4}
  .stat .l{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.1em}
  .pill{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);color:#06b6d4;padding:6px 16px;border-radius:99px;font-size:12px;font-weight:700}
</style>
</head>
<body>
<div class="bg"></div>
<div class="wrap">
  <div class="header">
    <div class="logo-row">
      <div class="logo">DG</div>
      <h1>DEV<span>GENIUS</span></h1>
    </div>
    <p class="sub">Plataforma completa de hardware, eletrônica e programação embarcada</p>
  </div>

  <div class="grid">
    <div class="card">
      <div class="icon">🔌</div>
      <h3>Controladoras & Componentes</h3>
      <p>Catálogo completo com Arduino, ESP32, STM32, sensores, atuadores e hardware PC com fichas técnicas detalhadas.</p>
      <span class="badge new">50+ itens</span>
    </div>
    <div class="card">
      <div class="icon">🔬</div>
      <h3>Laboratório IA</h3>
      <p>Monte sua bancada virtual e a IA gera esquemático completo com conexões, código e guia de montagem.</p>
      <span class="badge new">Gemini Pro</span>
    </div>
    <div class="card">
      <div class="icon">🤖</div>
      <h3>Chat IA — 150 Q&A</h3>
      <p>Assistente com 150 perguntas e respostas técnicas embutidas, matching inteligente e 12 categorias guiadas.</p>
      <span class="badge new">Offline-first</span>
    </div>
    <div class="card">
      <div class="icon">🎓</div>
      <h3>Provas & Certificação</h3>
      <p>3 módulos progressivos: Básico, Intermediário e Pro. 270 questões reais com explicações educacionais.</p>
      <span class="badge pro">270 questões</span>
    </div>
    <div class="card">
      <div class="icon">💻</div>
      <h3>Base de Código</h3>
      <p>C++, JavaScript e Python com módulos teóricos de 1000+ linhas cada. Fundamentos, IoT, IA e ML embarcado.</p>
      <span class="badge new">🐍 Python novo</span>
    </div>
    <div class="card">
      <div class="icon">📦</div>
      <h3>Projetos Prontos</h3>
      <p>10 projetos por componente com código completo, conexões e passo a passo. Guiado por dificuldade.</p>
      <span class="badge new">10 proj/comp</span>
    </div>
    <div class="card">
      <div class="icon">⭐</div>
      <h3>Coleção & Progresso</h3>
      <p>Marque componentes na sua coleção, acompanhe projetos concluídos e veja seu histórico nas configurações.</p>
      <span class="badge new">Novo</span>
    </div>
    <div class="card">
      <div class="icon">📱</div>
      <h3>Responsivo + PWA</h3>
      <p>Interface 100% responsiva mobile/tablet/desktop. Instale como app nativo com suporte offline via Service Worker.</p>
      <span class="badge new">PWA novo</span>
    </div>
  </div>

  <div class="footer">
    <div class="tag">devgenius.com.br &nbsp;·&nbsp; V12 · 2026</div>
    <div class="stats">
      <div class="stat"><div class="n">270</div><div class="l">Questões</div></div>
      <div class="stat"><div class="n">150</div><div class="l">Q&amp;A IA</div></div>
      <div class="stat"><div class="n">50+</div><div class="l">Componentes</div></div>
      <div class="stat"><div class="n">PWA</div><div class="l">Offline</div></div>
    </div>
    <div class="pill">GENIUS V12 // ANTIGRAVITY</div>
  </div>
</div>
</body>
</html>`;

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.setContent(summaryHTML, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await esperar(500);
  await page.screenshot({ path: join(OUT, '07_resumo_devgenius.png'), fullPage: false });

  await browser.close();
  console.log('\n✅ 7 screenshots salvas em:', OUT);
})();
