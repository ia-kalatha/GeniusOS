import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const OUT = 'C:/Users/ferna/Downloads/devgenius/screenshots';
mkdirSync(OUT, { recursive: true });

const W = 1440, H = 900, DPR = 2;

// ─── CSS base compartilhado ───────────────────────────────────────────────
const BASE_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#050a10;font-family:-apple-system,'Segoe UI',sans-serif;color:#fff;width:${W}px;height:${H}px;overflow:hidden}
  .sidebar{position:fixed;left:0;top:0;bottom:0;width:280px;background:rgba(10,10,15,.95);border-right:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;z-index:10}
  .logo-area{padding:32px;display:flex;align-items:center;gap:12px}
  .logo-box{width:40px;height:40px;background:#0a0a0a;border:1px solid rgba(255,255,255,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#06b6d4;font-size:14px;flex-shrink:0}
  .logo-text{font-size:18px;font-weight:900;letter-spacing:-1px}
  .logo-text span{color:#06b6d4}
  nav{flex:1;padding:0 16px;display:flex;flex-direction:column;gap:4px;overflow:hidden}
  .nav-item{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:20px;font-size:14px;font-weight:700;color:#6b7280;cursor:default;transition:all .2s}
  .nav-item.active{background:#06b6d4;color:#000;box-shadow:0 10px 25px rgba(6,182,212,.2)}
  .nav-item svg{width:18px;height:18px;flex-shrink:0}
  .main{position:fixed;left:280px;top:0;right:0;bottom:0;display:flex;flex-direction:column}
  .header{padding:24px 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.05);background:rgba(5,10,16,.7);backdrop-filter:blur(20px)}
  .header-left h2{font-size:28px;font-weight:900;letter-spacing:-1px;text-transform:uppercase}
  .header-left p{font-size:10px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:.2em;margin-top:2px}
  .header-right{display:flex;gap:12px;align-items:center}
  .pill{background:#18181b;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:8px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;display:flex;align-items:center;gap:6px}
  .pill.active{background:#06b6d4;color:#000;border-color:#06b6d4}
  .content{flex:1;overflow:hidden;padding:32px 40px}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .grid-5{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
  .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:32px;overflow:hidden;position:relative}
  .card:hover{border-color:rgba(6,182,212,.3)}
  .card-img{width:100%;aspect-ratio:1;background:#0a0a0a;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:40px;color:#374151;position:relative}
  .card-img .badge{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.9);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:3px 10px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#06b6d4}
  .card-img .star{position:absolute;top:10px;right:10px;width:28px;height:28px;background:rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px}
  .card-body{padding:18px}
  .card-body h3{font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card-body p{font-size:10px;color:#4b5563;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .card-actions{display:flex;gap:8px;padding:0 18px 18px}
  .btn-add{flex:1;height:44px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;display:flex;align-items:center;justify-content:center;gap:6px}
  .btn-add.added{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.2);color:#10b981}
  .btn-info{width:44px;height:44px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:14px}
  .search-bar{max-width:560px;margin:0 auto 24px;position:relative}
  .search-bar input{width:100%;background:rgba(24,24,27,.6);border:1px solid rgba(255,255,255,.07);border-radius:99px;padding:16px 24px 16px 52px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;outline:none}
  .search-icon{position:absolute;left:20px;top:50%;transform:translateY(-50%);color:#4b5563;font-size:16px}
  .cyan{color:#06b6d4}
  .tag-new{display:inline-block;background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);color:#06b6d4;padding:2px 8px;border-radius:99px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin-left:8px}
  .section-title{font-size:36px;font-weight:900;letter-spacing:-1.5px;text-transform:uppercase;margin-bottom:8px}
  .section-sub{font-size:13px;color:#6b7280;margin-bottom:28px}
`;

const SIDEBAR_ITEMS = [
  { icon:'⚡', label:'Controladoras', tab:'placas' },
  { icon:'🔧', label:'Componentes', tab:'componentes' },
  { icon:'🖥️', label:'Hardware PC', tab:'hardware_pc' },
  { icon:'🔬', label:'Laboratório', tab:'workspace' },
  { icon:'📦', label:'Projetos Prontos', tab:'projetos' },
  { icon:'🤖', label:'DevGenius IA', tab:'ia' },
  { icon:'📝', label:'Bloco de Notas', tab:'notas' },
  { icon:'💻', label:'Base de Código', tab:'code' },
  { icon:'🎓', label:'Provas & Testes', tab:'provas' },
  { icon:'❓', label:'FAQ Engenharia', tab:'faq' },
];

function sidebar(active) {
  return `
  <div class="sidebar">
    <div class="logo-area">
      <div class="logo-box">DG</div>
      <div class="logo-text">DEV<span>GENIUS</span></div>
    </div>
    <nav>
      ${SIDEBAR_ITEMS.map(i => `
        <div class="nav-item ${i.tab===active?'active':''}">
          <span>${i.icon}</span>${i.label}
        </div>`).join('')}
      <div style="margin-top:auto;padding-top:16px;border-top:1px solid rgba(255,255,255,.05)">
        <div class="nav-item"><span>ℹ️</span>Sobre o V12</div>
        <div class="nav-item"><span>⚙️</span>Configurações</div>
      </div>
    </nav>
    <div style="padding:16px;border-top:1px solid rgba(255,255,255,.05)">
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05);border-radius:24px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;background:#0a0a0a;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#06b6d4;font-size:18px;font-weight:900">U</div>
        <div><div style="font-size:13px;font-weight:800">Usuário</div><div style="font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:.1em">● Online</div></div>
      </div>
    </div>
  </div>`;
}

function header(title, sub='Sistema v12.4.0 // Núcleo Ativo', extra='') {
  return `
  <div class="header">
    <div class="header-left">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:8px;height:8px;border-radius:50%;background:#06b6d4;box-shadow:0 0 10px #06b6d4"></div>
        <h2>${title}</h2>
      </div>
      <p>${sub}</p>
    </div>
    <div class="header-right">${extra}</div>
  </div>`;
}

// ─── 1. CONTROLADORAS ────────────────────────────────────────────────────
const PLACAS = [
  {name:'Arduino Uno R3',tipo:'BÁSICA',color:'#06b6d4',emoji:'🤖'},
  {name:'Arduino Mega 2560',tipo:'BÁSICA',color:'#06b6d4',emoji:'🤖'},
  {name:'ESP32 DevKit V1',tipo:'ESPECIAL',color:'#a855f7',emoji:'📡'},
  {name:'Raspberry Pi Pico',tipo:'BÁSICA',color:'#06b6d4',emoji:'🍓'},
  {name:'Teensy 4.1',tipo:'AVANÇADO',color:'#ef4444',emoji:'⚡'},
];

const html1 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
.placa-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:32px;overflow:hidden;display:flex;flex-direction:column}
.placa-img{aspect-ratio:1;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-size:52px;position:relative;border-bottom:1px solid rgba(255,255,255,.05)}
.placa-badge{position:absolute;top:12px;left:12px;padding:4px 10px;border-radius:99px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;background:rgba(0,0,0,.9);border:1px solid rgba(255,255,255,.1)}
.placa-check{position:absolute;top:12px;right:12px;width:30px;height:30px;background:rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px}
.placa-info{padding:18px}
.placa-name{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;margin-bottom:6px}
.placa-desc{font-size:10px;color:#4b5563;line-height:1.5;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px}
.placa-actions{display:flex;gap:8px;margin-top:auto}
.btn{height:44px;border-radius:14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;justify-content:center;gap:6px;border:none;cursor:default}
.btn-primary{flex:1;background:rgba(255,255,255,.05);color:#6b7280;border:1px solid rgba(255,255,255,.06)}
.btn-square{width:44px;background:rgba(255,255,255,.05);color:#6b7280;border:1px solid rgba(255,255,255,.06)}
</style></head><body>
${sidebar('placas')}
<div class="main">
  ${header('CONTROLADORAS', 'Sistema v12.4.0 // Núcleo Ativo',
    `<div class="pill active">AMPLIADO</div><div class="pill">COMPACTO</div>
     <div class="pill active"><span>🌐</span>PT</div>
     <div style="background:#06b6d4;color:#000;border-radius:12px;padding:8px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em">ENTRAR NO KERNEL</div>`
  )}
  <div class="content">
    <div style="max-width:480px;margin:0 auto 24px;position:relative">
      <span style="position:absolute;left:20px;top:50%;transform:translateY(-50%);font-size:16px;color:#4b5563">🔍</span>
      <input style="width:100%;background:rgba(24,24,27,.6);border:1px solid rgba(255,255,255,.07);border-radius:99px;padding:14px 24px 14px 50px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;outline:none" placeholder="BUSCAR EM CONTROLADORAS... (NOME OU DESCRIÇÃO)" />
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px">
      ${PLACAS.map((p,i) => `
        <div class="placa-card">
          <div class="placa-img">
            <span>${p.emoji}</span>
            <div class="placa-badge" style="color:${p.color}">${p.tipo}</div>
            <div class="placa-check" style="${i<2?'background:#06b6d4;border-color:#06b6d4;color:#000':''}">✓</div>
          </div>
          <div class="placa-info">
            <div class="placa-name">${p.name}</div>
            <div class="placa-desc">Microcontrolador de alta performance para projetos de hardware embarcado, IoT e automação.</div>
            <div class="placa-actions">
              <div class="btn btn-primary">${i<2?'✓ MAPEAR':'+ LAB'}</div>
              <div class="btn btn-square">ℹ</div>
            </div>
          </div>
        </div>`).join('')}
    </div>
  </div>
</div>
</body></html>`;

// ─── 2. COMPONENTES ───────────────────────────────────────────────────────
const COMPS = [
  {name:'Sensor DHT22',tipo:'AVANÇADO',emoji:'🌡️'},{name:'HC-SR04 Ultrassônico',tipo:'AVANÇADO',emoji:'📡'},
  {name:'Display OLED I2C',tipo:'AVANÇADO',emoji:'🖥️'},{name:'Servo MG996R',tipo:'AVANÇADO',emoji:'⚙️'},
  {name:'MPU6050 IMU',tipo:'AVANÇADO',emoji:'🔄'},{name:'Módulo RTC DS3231',tipo:'AVANÇADO',emoji:'🕐'},
  {name:'Relé 5V SSR',tipo:'NORMAL',emoji:'🔌'},{name:'Leitor RFID RC522',tipo:'AVANÇADO',emoji:'💳'},
];
const html2 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
${sidebar('componentes')}
<div class="main">
  ${header('COMPONENTES')}
  <div class="content">
    <div style="max-width:480px;margin:0 auto 20px;position:relative">
      <span style="position:absolute;left:20px;top:50%;transform:translateY(-50%);font-size:16px;color:#4b5563">🔍</span>
      <input style="width:100%;background:rgba(24,24,27,.6);border:1px solid rgba(255,255,255,.07);border-radius:99px;padding:12px 24px 12px 50px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;outline:none" placeholder="BUSCAR EM COMPONENTES..." />
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      ${COMPS.map((c,i) => `
        <div class="card">
          <div class="card-img">
            <span style="font-size:44px">${c.emoji}</span>
            <div class="badge">${c.tipo}</div>
            <div class="star" style="${i===0?'background:#06b6d4;border-color:#06b6d4;color:#000':''}">✓</div>
          </div>
          <div class="card-body">
            <h3>${c.name}</h3>
            <p>Componente de engenharia para projetos embarcados com alta precisão e confiabilidade.</p>
          </div>
          <div class="card-actions">
            <div class="btn-add ${i===0?'added':''}">
              ${i===0?'✓ MAPEAR':'+ LAB'}
            </div>
            <div class="btn-info">ℹ</div>
          </div>
        </div>`).join('')}
    </div>
  </div>
</div>
</body></html>`;

// ─── 3. DEVGENIUS IA ──────────────────────────────────────────────────────
const html3 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
.ia-panel{background:rgba(10,10,15,.8);border:1px solid rgba(255,255,255,.05);border-radius:48px;height:700px;display:flex;flex-direction:column;overflow:hidden}
.ia-header{padding:24px 32px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:16px}
.ia-logo{width:48px;height:48px;background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:22px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.ia-modes{display:flex;background:#111;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:4px;gap:4px;margin-left:auto}
.ia-mode{padding:8px 16px;border-radius:10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#6b7280}
.ia-mode.active{background:#06b6d4;color:#000}
.categories{padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.04);background:rgba(0,0,0,.2)}
.cat-label{font-size:9px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.2em;margin-bottom:10px}
.cats{display:flex;flex-wrap:wrap;gap:8px}
.cat-btn{padding:8px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:flex;align-items:center;gap:6px}
.cat-btn.active{background:#06b6d4;border-color:#06b6d4;color:#000;box-shadow:0 4px 15px rgba(6,182,212,.2)}
.chat-area{flex:1;padding:24px;display:flex;flex-direction:column;gap:16px;overflow:hidden}
.msg{max-width:75%;border-radius:24px;padding:16px 20px;font-size:13px;line-height:1.6}
.msg.user{align-self:flex-end;background:#06b6d4;color:#000;font-weight:600;border-bottom-right-radius:6px}
.msg.ia{align-self:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#d1d5db;border-bottom-left-radius:6px}
.msg.ia strong{color:#06b6d4}
.ia-input{padding:16px 24px;background:rgba(0,0,0,.5);border-top:1px solid rgba(255,255,255,.05)}
.input-wrap{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:12px 16px 12px 20px;display:flex;gap:12px;align-items:center}
.input-wrap input{flex:1;background:none;border:none;outline:none;color:#9ca3af;font-size:13px}
.send-btn{width:40px;height:40px;background:#06b6d4;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#000;font-size:18px;flex-shrink:0}
</style></head><body>
${sidebar('ia')}
<div class="main">
  ${header('DEVGENIUS IA', '150 respostas embutidas // Gemini como fallback')}
  <div class="content" style="padding-top:24px">
    <div class="ia-panel">
      <div class="ia-header">
        <div class="ia-logo">🤖</div>
        <div>
          <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">ASSISTENTE DEVGENIUS IA</div>
          <div style="font-size:10px;color:#10b981;font-weight:800;text-transform:uppercase;letter-spacing:.15em">150 Q&A embutidas // Modo Guiado</div>
        </div>
        <div class="ia-modes">
          <div class="ia-mode active">⊞ Guiado</div>
          <div class="ia-mode">✉ Livre</div>
        </div>
      </div>
      <div class="categories">
        <div class="cat-label">CATEGORIAS</div>
        <div class="cats">
          ${['🤖 Arduino','📡 ESP32','🔭 Sensores','⚡ Eletrônica','🔗 Comunicação','⚙️ Atuadores','🌐 IoT & Cloud','🔋 Energia','🖨️ PCB','💻 C++ Avançado','🚀 DevGenius','🛠️ Projetos'].map((c,i)=>`<div class="cat-btn ${i===0?'active':''}">${c}</div>`).join('')}
        </div>
      </div>
      <div class="chat-area">
        <div class="msg user">Como usar sensor DHT22 no Arduino?</div>
        <div class="msg ia">
          <strong>## Lendo temperatura com DHT22</strong><br><br>
          Conecte: VCC→5V, GND→GND, DATA→pino 4 (+ resistor 4.7kΩ VCC→DATA).<br><br>
          <code style="background:rgba(0,0,0,.4);padding:4px 8px;border-radius:6px;font-size:11px;color:#06b6d4">#include &lt;DHT.h&gt;<br>DHT dht(4, DHT22);<br>float t = dht.readTemperature();</code>
        </div>
        <div class="msg user">Como conectar ESP32 ao WiFi?</div>
        <div class="msg ia"><strong>✅ Resposta da base embutida</strong> — WiFi.begin(ssid, password); while (WiFi.status() != WL_CONNECTED) delay(500);</div>
      </div>
      <div class="ia-input">
        <div class="input-wrap">
          <input placeholder="Ou digite qualquer dúvida técnica..." />
          <div class="send-btn">➤</div>
        </div>
        <div style="text-align:center;font-size:8px;color:#374151;font-weight:800;text-transform:uppercase;letter-spacing:.15em;margin-top:10px">150 Q&A EMBUTIDAS // MATCHING POR PALAVRAS-CHAVE // GEMINI COMO BACKUP</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

// ─── 4. PROVAS & TESTES ───────────────────────────────────────────────────
const html4 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
.modulos{display:flex;background:#111;border:1px solid rgba(255,255,255,.05);border-radius:24px;padding:6px;gap:6px;margin-bottom:28px;width:fit-content;margin-left:auto;margin-right:auto}
.mod-btn{padding:12px 24px;border-radius:18px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:8px;color:#6b7280}
.mod-btn.cyan{background:#06b6d4;color:#000;box-shadow:0 8px 20px rgba(6,182,212,.3)}
.mod-btn.amber{background:#f59e0b;color:#000;box-shadow:0 8px 20px rgba(245,158,11,.3)}
.mod-btn.red{background:#ef4444;color:#fff;box-shadow:0 8px 20px rgba(239,68,68,.3)}
.trilha-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:32px;padding:28px;transition:all .2s}
.trilha-card:hover{border-color:rgba(6,182,212,.4);background:rgba(6,182,212,.03)}
.trilha-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:18px}
.trilha-title{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;margin-bottom:8px}
.trilha-desc{font-size:11px;color:#6b7280;line-height:1.5;margin-bottom:16px}
.trilha-footer{display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,.05)}
.bar-wrap{height:6px;background:#111;border-radius:99px;overflow:hidden;flex:1;margin-right:12px}
.bar-fill{height:100%;border-radius:99px}
</style></head><body>
${sidebar('provas')}
<div class="main">
  ${header('PROVAS & TESTES')}
  <div class="content">
    <div style="text-align:center;margin-bottom:20px">
      <div class="section-title">CENTRO DE <span class="cyan">CERTIFICAÇÃO</span></div>
      <div class="section-sub">3 módulos de dificuldade crescente — 270 questões reais com explicações educacionais</div>
    </div>
    <div class="modulos">
      <div class="mod-btn cyan">⊞ Módulo 1 — Básico</div>
      <div class="mod-btn amber">⚡ Módulo 2 — Intermediário</div>
      <div class="mod-btn red">🏆 Módulo 3 — Pro</div>
    </div>
    <div style="max-width:320px;margin:0 auto 28px">
      <div style="display:flex;justify-content:space-between;font-size:9px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">
        <span>Performance — Módulo 1</span><span>60 / 90</span>
      </div>
      <div style="height:10px;background:#111;border-radius:99px;overflow:hidden">
        <div style="width:67%;height:100%;background:linear-gradient(to right,#0891b2,#06b6d4);box-shadow:0 0 12px rgba(6,182,212,.4)"></div>
      </div>
    </div>
    <div class="grid-3">
      ${[
        {label:'Eletrônica Básica',desc:'Tensão, corrente, Lei de Ohm, componentes passivos.',icon:'⚡',color:'#06b6d4',bg:'rgba(6,182,212,.1)',score:20,done:false},
        {label:'Arduino do Zero',desc:'Sketch, pinos digitais e analógicos, serial e PWM.',icon:'🤖',color:'#06b6d4',bg:'rgba(6,182,212,.1)',score:30,done:true},
        {label:'Sensores & Atuadores',desc:'DHT, HC-SR04, MPU6050, servo, motor e relé.',icon:'🔭',color:'#10b981',bg:'rgba(16,185,129,.1)',score:30,done:true},
      ].map(t => `
        <div class="trilha-card" style="${t.done?'border-color:rgba(16,185,129,.25);background:rgba(16,185,129,.03)':''}">
          <div class="trilha-icon" style="background:${t.bg}">${t.icon}</div>
          <div class="trilha-title" style="color:${t.done?'#10b981':'#fff'}">${t.label}</div>
          <div class="trilha-desc">${t.desc}</div>
          <div class="trilha-footer">
            <div class="bar-wrap">
              <div class="bar-fill" style="width:${t.score/30*100}%;background:${t.done?'#10b981':'#06b6d4'}"></div>
            </div>
            <span style="font-size:10px;font-weight:800;color:${t.done?'#10b981':'#06b6d4'}">
              ${t.done?'🏆':''}${t.score}/30
            </span>
          </div>
        </div>`).join('')}
    </div>
  </div>
</div>
</body></html>`;

// ─── 5. BASE DE CÓDIGO (PYTHON) ───────────────────────────────────────────
const html5 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
.lang-tabs{display:flex;gap:8px;background:#111;border:1px solid rgba(255,255,255,.06);border-radius:18px;padding:6px}
.lang-tab{padding:10px 24px;border-radius:12px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
.lang-tab.active-cpp{background:#fff;color:#000}
.lang-tab.active-py{background:#f59e0b;color:#000;box-shadow:0 4px 12px rgba(245,158,11,.3)}
.lesson-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.05)}
.lesson-tab{flex:1;padding:18px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#4b5563;border-bottom:2px solid transparent;text-align:center}
.lesson-tab.active{color:#06b6d4;border-bottom-color:#06b6d4;background:rgba(6,182,212,.03)}
.content-area{padding:32px;overflow:hidden;height:100%}
.lesson-title{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;margin-bottom:20px;display:flex;align-items:center;gap:10px}
.lesson-dot{width:6px;height:6px;border-radius:50%;background:#06b6d4}
.lesson-text p{font-size:13px;color:#6b7280;line-height:1.8;margin-bottom:12px}
.lesson-text p strong{color:#9ca3af}
</style></head><body>
${sidebar('code')}
<div class="main">
  ${header('BASE DE CÓDIGO')}
  <div class="content" style="padding:0">
    <div style="background:rgba(5,10,16,.8);border:1px solid rgba(255,255,255,.05);border-radius:32px;overflow:hidden;height:720px;display:flex;flex-direction:column;margin:24px">
      <div style="padding:24px 32px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-.03em">BASE DE CONHECIMENTO V12</div>
          <div style="font-size:10px;color:#06b6d4;font-weight:700;text-transform:uppercase;letter-spacing:.2em">C++ & JavaScript & Python Core Training</div>
        </div>
        <div class="lang-tabs">
          <div class="lang-tab">C++ HARDWARE</div>
          <div class="lang-tab">JAVASCRIPT IoT</div>
          <div class="lang-tab active-py">🐍 PYTHON</div>
        </div>
      </div>
      <div class="lesson-tabs">
        <div class="lesson-tab active">AULA 01 // FUNDAMENTOS</div>
        <div class="lesson-tab">AULA 02 // CIÊNCIA DE DADOS</div>
        <div class="lesson-tab">AULA 03 // IA EMBARCADA</div>
      </div>
      <div class="content-area">
        <div class="lesson-title">
          <div class="lesson-dot"></div>
          PYTHON FUNDAMENTOS E HARDWARE
        </div>
        <div class="lesson-text">
          <p>Python é uma das linguagens mais versáteis do mundo da tecnologia moderna, e no contexto de <strong>hardware e IoT</strong> ela se tornou indispensável. Sua sintaxe limpa, legibilidade excepcional e enorme ecossistema de bibliotecas fazem de Python a escolha ideal tanto para iniciantes quanto para engenheiros experientes.</p>
          <p>No <strong>MicroPython</strong>, o módulo machine é o coração do controle de hardware: <code style="background:rgba(0,0,0,.4);padding:2px 6px;border-radius:4px;color:#06b6d4;font-size:11px">from machine import Pin, I2C, SPI, ADC, PWM, UART</code>. Pin(14, Pin.OUT) cria saída digital. Operações são vetorizadas usando <strong>NumPy</strong>, permitindo processar streams de dados de sensores com eficiência máxima.</p>
          <p>A integração com <strong>Raspberry Pi GPIO</strong>, comunicação serial <strong>I2C/SPI</strong>, protocolo <strong>MQTT com paho</strong>, APIs REST e bancos SQLite tornam Python o elo perfeito entre hardware físico e a nuvem.</p>
          <p>Threading e asyncio permitem múltiplas tarefas simultâneas sem bloquear o loop principal — fundamental para sistemas IoT que precisam ler sensores, enviar dados e responder a comandos ao mesmo tempo.</p>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

// ─── 6. PROJETOS PRONTOS ──────────────────────────────────────────────────
const PROJS = [
  {title:'Estação Meteorológica',comps:3,diff:'Intermediário',color:'#f59e0b'},
  {title:'Robô Seguidor de Linha',comps:5,diff:'Avançado',color:'#ef4444'},
  {title:'Portão Automático',comps:2,diff:'Iniciante',color:'#10b981'},
  {title:'Smart Home ESP32',comps:6,diff:'Avançado',color:'#ef4444'},
];
const html6 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
.proj-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:28px;padding:24px;display:flex;gap:20px;cursor:default;transition:all .2s}
.proj-card:hover{border-color:rgba(6,182,212,.3)}
.proj-img{width:120px;height:120px;border-radius:20px;background:#0a0a0a;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:44px;flex-shrink:0}
.proj-info{flex:1}
.proj-diff{display:inline-block;padding:3px 10px;border-radius:99px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.proj-name{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;margin-bottom:8px}
.proj-desc{font-size:11px;color:#6b7280;line-height:1.5}
.proj-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
.proj-comps{font-size:10px;font-weight:800;color:#4b5563;text-transform:uppercase}
.proj-arrow{font-size:18px;color:#06b6d4}
.comp-tabs{display:flex;gap:8px;background:#111;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:6px;margin-bottom:24px;width:fit-content;margin-left:auto;margin-right:auto}
.comp-tab{padding:10px 20px;border-radius:12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
.comp-tab.active{background:#06b6d4;color:#000}
</style></head><body>
${sidebar('projetos')}
<div class="main">
  ${header('PROJETOS PRONTOS')}
  <div class="content">
    <div style="text-align:center;margin-bottom:20px">
      <div class="section-title">PROJETOS <span class="cyan">PRONTOS</span></div>
      <div class="section-sub">10 projetos com código completo por componente • conexões • passo a passo</div>
    </div>
    <div class="comp-tabs">
      ${['2 COMPS','3 COMPS','4 COMPS','5 COMPS','SUPER (6+)'].map((t,i)=>`<div class="comp-tab ${i===2?'active':''}">${t}</div>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      ${PROJS.map((p,i) => `
        <div class="proj-card">
          <div class="proj-img">${['🌡️','🤖','🚪','🏠'][i]}</div>
          <div class="proj-info">
            <div class="proj-diff" style="background:${p.color}20;color:${p.color};border:1px solid ${p.color}40">${p.diff}</div>
            <div class="proj-name">${p.title}</div>
            <div class="proj-desc">Projeto completo com código Arduino/ESP32, diagrama de conexões e guia passo a passo para montagem.</div>
            <div class="proj-footer">
              <div class="proj-comps">📦 ${p.comps} Componentes</div>
              <div class="proj-arrow">→</div>
            </div>
          </div>
        </div>`).join('')}
    </div>
  </div>
</div>
</body></html>`;

// ─── 7. RESUMO COMPLETO ───────────────────────────────────────────────────
const html7 = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050a10;font-family:-apple-system,'Segoe UI',sans-serif;color:#fff;width:1440px;height:900px;overflow:hidden;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse 90% 70% at 50% -5%,rgba(6,182,212,.08) 0,transparent 60%),radial-gradient(ellipse 40% 40% at 80% 80%,rgba(168,85,247,.05) 0,transparent 50%)}
.grid-lines{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(6,182,212,1) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,1) 1px,transparent 1px);background-size:60px 60px}
.wrap{position:relative;z-index:1;padding:48px 64px;height:100%;display:flex;flex-direction:column;gap:36px}
.hdr{display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:18px}
.logo-box{width:56px;height:56px;background:#0a0a0a;border:1px solid rgba(6,182,212,.3);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#06b6d4;box-shadow:0 0 30px rgba(6,182,212,.15)}
.brand-text{font-size:48px;font-weight:900;letter-spacing:-2px;line-height:1}
.brand-text span{color:#06b6d4}
.tagline{font-size:14px;color:#4b5563;font-weight:500;letter-spacing:.05em;margin-top:4px}
.stats-row{display:flex;gap:16px}
.stat-chip{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:12px 20px;text-align:center}
.stat-n{font-size:22px;font-weight:900;color:#06b6d4}
.stat-l{font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
.features{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;flex:1}
.feat{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:24px;padding:24px;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden;transition:border-color .2s}
.feat::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,var(--c) 0,transparent 60%);opacity:.04}
.feat .ico{font-size:28px}
.feat h3{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:-.01em}
.feat p{font-size:11px;color:#6b7280;line-height:1.5;flex:1}
.feat .tag{display:inline-block;padding:3px 10px;border-radius:99px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-top:auto;width:fit-content}
.new-tag{background:rgba(6,182,212,.12);color:#06b6d4;border:1px solid rgba(6,182,212,.2)}
.py-tag{background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.2)}
.pro-tag{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)}
.ftr{display:flex;align-items:center;justify-content:space-between;padding-top:20px;border-top:1px solid rgba(255,255,255,.05)}
.ftr-tag{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#374151}
.pill-cyan{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);color:#06b6d4;padding:8px 20px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.05em}
.pwa-badge{background:#1e293b;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:6px 14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;display:flex;align-items:center;gap:6px}
</style></head><body>
<div class="bg"></div>
<div class="grid-lines"></div>
<div class="wrap">
  <div class="hdr">
    <div class="brand">
      <div class="logo-box">DG</div>
      <div>
        <div class="brand-text">DEV<span>GENIUS</span></div>
        <div class="tagline">Plataforma completa de hardware, eletrônica e programação embarcada</div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-chip"><div class="stat-n">270</div><div class="stat-l">Questões</div></div>
      <div class="stat-chip"><div class="stat-n">150</div><div class="stat-l">Q&A IA</div></div>
      <div class="stat-chip"><div class="stat-n">50+</div><div class="stat-l">Componentes</div></div>
      <div class="stat-chip"><div class="stat-n">3</div><div class="stat-l">Linguagens</div></div>
    </div>
  </div>

  <div class="features">
    <div class="feat" style="--c:#06b6d4">
      <div class="ico">⚡</div>
      <h3>Controladoras & Componentes</h3>
      <p>Catálogo completo com 50+ items — Arduino, ESP32, sensores, atuadores. Fichas técnicas, specs e código base.</p>
      <div class="tag new-tag">50+ itens catalogados</div>
    </div>
    <div class="feat" style="--c:#8b5cf6">
      <div class="ico">🔬</div>
      <h3>Laboratório IA</h3>
      <p>Monte sua bancada virtual. A IA (Gemini Pro) gera esquemático completo com conexões e código.</p>
      <div class="tag new-tag">Gemini Pro</div>
    </div>
    <div class="feat" style="--c:#06b6d4">
      <div class="ico">🤖</div>
      <h3>Chat IA — 150 Q&A</h3>
      <p>150 respostas embutidas com matching inteligente por palavras-chave. 12 categorias guiadas. Funciona offline.</p>
      <div class="tag new-tag">Offline-first</div>
    </div>
    <div class="feat" style="--c:#ef4444">
      <div class="ico">🎓</div>
      <h3>Provas — 3 Módulos</h3>
      <p>Básico, Intermediário e Pro. 270 questões reais com explicações educacionais completas por resposta.</p>
      <div class="tag pro-tag">270 questões</div>
    </div>
    <div class="feat" style="--c:#f59e0b">
      <div class="ico">🐍</div>
      <h3>Python na Base de Código</h3>
      <p>3 módulos teóricos ~1000 linhas cada: Fundamentos+Hardware, Ciência de Dados, IA & ML Embarcado.</p>
      <div class="tag py-tag">🐍 Novo</div>
    </div>
    <div class="feat" style="--c:#06b6d4">
      <div class="ico">📦</div>
      <h3>Projetos com Código Completo</h3>
      <p>10 projetos por componente. Código completo, conexões e guia passo a passo por dificuldade.</p>
      <div class="tag new-tag">10 proj/componente</div>
    </div>
    <div class="feat" style="--c:#06b6d4">
      <div class="ico">✅</div>
      <h3>Coleção & Progresso</h3>
      <p>Marque itens na sua coleção, acompanhe projetos concluídos. Histórico completo nas configurações.</p>
      <div class="tag new-tag">Sistema índice</div>
    </div>
    <div class="feat" style="--c:#10b981">
      <div class="ico">📱</div>
      <h3>Responsivo + PWA</h3>
      <p>Interface 100% responsiva. Instale como app nativo. Service Worker para uso offline. Mobile-first.</p>
      <div class="tag new-tag">PWA Instalável</div>
    </div>
  </div>

  <div class="ftr">
    <div class="ftr-tag">devgenius.com.br &nbsp;·&nbsp; V12.4.0 · 2026</div>
    <div style="display:flex;gap:10px;align-items:center">
      <div class="pwa-badge">📱 PWA Ready</div>
      <div class="pwa-badge">🔒 Auth Seguro</div>
      <div class="pwa-badge">☁️ Cloud Sync</div>
    </div>
    <div class="pill-cyan">GENIUS V12 // ANTIGRAVITY</div>
  </div>
</div>
</body></html>`;

// ─── CAPTURAR ─────────────────────────────────────────────────────────────
const PAGES = [
  { file:'01_controladoras.png', html: html1 },
  { file:'02_componentes.png',   html: html2 },
  { file:'03_ia_chat.png',       html: html3 },
  { file:'04_provas_testes.png', html: html4 },
  { file:'05_base_codigo_python.png', html: html5 },
  { file:'06_projetos_prontos.png',   html: html6 },
  { file:'07_resumo_devgenius.png',   html: html7 },
];

(async () => {
  console.log('Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: DPR }
  });

  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setContent(p.html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 400));
    const path = join(OUT, p.file);
    await page.screenshot({ path, fullPage: false });
    await page.close();
    console.log(`✅ ${p.file}`);
  }

  await browser.close();
  console.log(`\n🎉 7 imagens salvas em: ${OUT}`);
})();
