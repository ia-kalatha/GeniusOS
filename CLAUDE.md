# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DEVGENIUS — full-stack React 19 + Vite + Express app with Google Gemini integration. Frontend is Tailwind v4. Backend is Node.js 22+ Express. Target host is Hostinger (Cloud / VPS / Node.js plan).

Posicionamento atual (escolhido 2026-05-18): **Wikipedia maker BR + plataforma educacional gamificada**. Catálogo curado + trilhas estruturadas alimentam SEO e B2B escolas. IA é diferencial mas não produto principal.

## Commands

```bash
npm run dev      # tsx server.ts → Express com Vite middleware (HMR), http://localhost:3000
npm run build    # vite build (→ dist/) AND esbuild bundle server.ts (→ server.cjs)
npm start        # NODE_ENV=production node server.cjs — serve dist/ + API
npm run lint     # tsc --noEmit (typecheck only — sem suite de testes, sem ESLint)
npm run clean    # rm -rf dist server.cjs
```

Override de porta com `PORT=4000 npm run dev`. Não setar `PORT` na Hostinger — o painel injeta.

## Architecture

### Single Express server, two modes (cuidado!)

`server.ts` é o único entrypoint backend. Branch em `isProd` (= `NODE_ENV === "production"`):

- **Dev**: monta Vite como middleware (`createViteServer({ middlewareMode: true })`). HMR + API no mesmo processo. **Sempre** usa Vite em dev — não cai em modo estático se `dist/` existir.
- **Prod**: serve `dist/` estático com fallback SPA para `dist/index.html`. Falha cedo (exit 1) se `dist/index.html` não existir.

**Histórico**: a condição antiga `NODE_ENV !== "production" && !hasDist` causou bug silencioso — dev caía em estático se um `npm run build` local tivesse criado `dist/`. Mudanças em `src/` ficavam mascaradas. **Não reintroduzir o `hasDist` check.** (commit f6a95ce)

### Hostinger ESM→CJS shim

`package.json` é `"type": "module"`, mas o painel da Hostinger auto-detecta `server.ts` e força `server.js` como entry. Bridge:

1. `npm run build:server` usa esbuild para gerar **`server.cjs` na raiz** (não em `dist/`).
2. `server.js` (ESM) faz `import './server.cjs';` apenas para sobrepor a detecção automática.

Nunca apague `server.js`. Nunca mova `server.cjs` para `dist/`. Nunca mude o target do esbuild de `node22`.

### Auth: localStorage (cliente) + rotas server "mortas"

**Descoberta importante**: o cliente (`AuthPage.tsx` + `Dashboard.tsx`) usa **100% localStorage** para auth. As rotas `/api/auth/*` no server existem mas são **código morto** (nunca chamadas). Apenas `/api/ai-chat` e `/api/ai-schematic` são consumidas pelo cliente.

Por isso a segurança Fase 1 foi aplicada **dos dois lados**:
- Server: bcrypt nas rotas auth, helmet, rate-limit (vale para a IA), recovery codes em `users.json.codes` com TTL 15min
- Client: bcrypt nas senhas do `localStorage:devgenius_v12_users` + migração transparente plaintext→hash no próximo login OK

**Não remover bcrypt do cliente achando que é só mock** — é a auth real do app.

### Segurança aplicada (Fase 1 — commit 2fef5c7)

- `bcryptjs` (server + client) com migração transparente: senha sem prefixo `$2` = legada, comparar plaintext e re-hashear
- `helmet` (X-Frame, nosniff, HSTS) — CSP off para Vite/Google Fonts
- `express-rate-limit`: `/api/ai-*` 20/min; `/api/auth/login,register,verify,reset` 10/min; `/api/auth/forgot` 5/15min
- Recovery codes persistidos em `users.json.codes` (TTL 15min, limpeza on-write); `/api/auth/reset-password` exige código válido
- `rehype-sanitize` nos 2 `ReactMarkdown` (Dashboard.tsx — saída da IA é XSS-prone sem isso)
- Upload de imagem: MIME `image/*` + ≤500KB
- Render de imagens: `safeImageSrc()` whitelist `https:`/`data:image/`/`/`
- `autoComplete` correto em todos os inputs sensíveis
- Mensagens neutras (sem vazar "GEMINI_API_KEY"/"Hostinger"/"public_html/api/.env")

Pendências: CSRF (low urgency sem auth real), SMTP recovery, LGPD validação de idade.

### Frontend structure

- `src/main.tsx` → `src/App.tsx` → `Dashboard` (sempre visível) + `AuthPage` (overlay modal). Sessão **não persiste** — App sempre arranca deslogado.
- `src/components/Dashboard.tsx` ~2.500 linhas, 37 `useState`, monolito com 4 painéis inline (`IAPanel`, `CompilePanel`, `CodeSnippets`, `TestInstance`). Refactor está no roadmap mas não foi feito ainda.
- `src/components/AuthPage.tsx` ~700 linhas com fluxo `welcome → questionnaire → register/login → forgot/verify/reset`.
- `src/data/` contém catálogos estáticos:
  - `hardware.ts` — 5 placas + 51 componentes + 5 PCs (categoria PCs marcada pra cortar no roadmap)
  - `projects.ts` — 10 projetos guiados com código C++ real
  - `questions.ts` — **90 questões reais curadas** em 3 trilhas (eletronica, arduino, sensores). Substituiu gerador procedural fake. Cada questão tem `explanation` que aparece no `TestInstance` após resposta.
- Vite alias: `@/*` → raiz do repo.
- Tailwind v4 via plugin `@tailwindcss/vite` (sem `tailwind.config.js` clássico).

### Assets (imagens)

Catálogo de hardware usa **imagens locais** em `public/img/{placas,componentes,pcs,projetos}/`. Fonte: Wikimedia Commons (licença livre). Otimização: `sips -Z 600 -s formatOptions 75` (max 600px, JPEG 75%).

Atualmente 57/71 itens com foto real + 14 componentes com placeholder SVG (`public/img/componentes/_placeholder.svg`) — módulos hobby específicos que Wikimedia não tem.

**Anti-padrão**: não voltar a usar URLs externas (mlstatic.com etc.) — risco de link break, hotlinking, CORS. Sempre baixar local e otimizar com sips.

### Gemini integration

Cliente único `new GoogleGenAI({ apiKey: GEMINI_API_KEY })` em `server.ts`. Constante `GEMINI_MODEL = "gemini-1.5-flash"` — muda em um lugar só. Sem `GEMINI_API_KEY`, as rotas `/api/ai-*` devolvem 503 (mensagem neutra); o servidor sobe normalmente.

O prompt do `/api/ai-schematic` é template grande em pt-BR — editar inline em `server.ts`.

### Hostinger / deploy

- Plano Node.js. Versão 22.x. Modo `Production`. Framework Express.
- Entry file: `server.js` (forçado pelo painel) — shim que importa `server.cjs`.
- `GEMINI_API_KEY` e `NODE_ENV=production` em Variáveis de Ambiente. **Nunca** definir `PORT`.
- Fluxo: subir código → `npm install` no painel → script `build` no painel → Reiniciar.

### Quiz/Provas (refatorado 2bd7a51)

- `Trilha = "eletronica" | "arduino" | "sensores"` — 30 questões cada
- `TRILHA_INFO` exporta `label` e `desc`
- `TestProgress = Record<Trilha, { best, completed }>` em localStorage `tests_v3_${username}` (versão anterior `tests_v2_` migrou via bump)
- `ProvasView` agora é 3 cards de trilha (sem level switcher antigo de 5 subjects)
- `TestInstance` tem estado `revealed` — após confirmar resposta, opção correta vira verde, escolhida errada vira vermelha, exibe `explanation`

Adicionar questão nova: seguir formato `{ id: "<el|ar|se>-XX", text, options: [4], correctIndex: 0..3, explanation }`.

## Conventions

- Strings expostas ao usuário (UI, erros, prompts) em **pt-BR**.
- Tom de copy é **educacional sóbrio** desde commit 7a8a289 (sem "DEVCORE V12 Kernel Supremacy", sem "Identidade Digital", sem "Família"). Posicionamento A+C exige tom vendável para escolas.
- Difficulty consolidada em 4 níveis: `"Básico" | "Intermediário" | "Avançado" | "Expert"`.
- Node 22+ pinned (`.nvmrc`, `engines.node`, esbuild target).
- Sem suíte de testes nem ESLint — `npm run lint` é só `tsc --noEmit`. Rodar após mudanças não triviais em TypeScript.
- `standalone.html` é demo legada na raiz — **não entra no build**. Não editar para entregar features.
- Commits: pt-BR, Conventional Commits (`tipo(escopo): assunto`), Co-Authored-By Claude Opus 4.7. Separar por contexto lógico (security/assets/seo/refactor/feat) — não fazer commits monolíticos.

## Tooling extra disponível

- `.claude/agents/` tem 3 agentes especialistas:
  - `geniusos-web` — para mudanças neste repo (conhece arquitetura, security posture, quiz)
  - `web-fullstack` — para web genérico fora deste repo
  - `arduino-iot` — para tarefas de hardware/Arduino/ESP32/IoT
- Memória persistente em `~/.claude/projects/-Users-viniciusvmorais-VS-Code-GeniusOS/memory/` documenta user, project state, security posture, quiz structure, asset strategy e padrões de feedback observados.
