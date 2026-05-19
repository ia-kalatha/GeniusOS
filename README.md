# DevGenius V12 — Plataforma de Engenharia de Hardware e Software

App full-stack (React + Vite + Express) com IA integrada via Gemini.

- **Frontend:** React 19 + Vite + Tailwind v4
- **Backend:** Express (Node.js **22.x**)
- **IA:** Google Gemini (`@google/genai`)
- **Hospedagem alvo:** Hostinger (Cloud / VPS / planos com Node.js)

---

## 1. Pré-requisitos

- Node.js **22.x** (use `.nvmrc`: `nvm use`)
- Conta na Hostinger com plano que suporte Node.js (Cloud Startup / Business Cloud / VPS)
- Chave de API Gemini: <https://aistudio.google.com/apikey>

---

## 2. Desenvolvimento local

```bash
cp .env.example .env
# Edite .env e coloque sua GEMINI_API_KEY

npm install
npm run dev
# abre em http://localhost:3000
```

---

## 3. Build de produção

```bash
npm run build
# Gera:
#   dist/index.html + dist/assets/...   (frontend)
#   dist/server.cjs                     (Express bundled)
```

Teste localmente o build de produção:

```bash
npm start
# http://localhost:3000
```

---

## 4. Deploy na Hostinger (Node.js)

### 4.1. Suba o código

Envie a pasta do projeto (sem `node_modules/` e sem `dist/`) para
`domains/SEU_DOMINIO/public_html/` via:

- **Git** (preferido): conecte o repositório no painel da Hostinger, ou clone via SSH.
- **File Manager** ou **FTP**: envie um ZIP e extraia.

Arquivos/pastas mínimos no servidor:

```
public_html/
├── package.json
├── package-lock.json
├── server.ts
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .nvmrc
├── public/
└── src/
```

### 4.2. Configure o app Node.js no hPanel

1. **hPanel → Avançado → Node.js**
2. Clique em **Criar aplicação** e preencha:
   - **Versão do Node.js:** `22.x`
   - **Modo de aplicação:** `Production`
   - **Raiz da aplicação:** caminho da pasta do projeto (ex.: `public_html`)
   - **URL da aplicação:** seu domínio (ex.: `seudominio.com`)
   - **Arquivo de inicialização:** `dist/server.cjs`
3. Clique em **Criar**.

### 4.3. Variáveis de ambiente

Ainda na tela do app Node.js, em **Variáveis de Ambiente**, adicione:

| Nome             | Valor                |
|------------------|----------------------|
| `GEMINI_API_KEY` | *(sua chave Gemini)* |
| `NODE_ENV`       | `production`         |

> **Não defina `PORT`** — a Hostinger injeta automaticamente.

### 4.4. Instalar dependências e buildar

Ainda no painel Node.js da Hostinger:

1. Clique em **Executar NPM Install** (ou via SSH: `npm install`).
2. Em **Executar script NPM**, rode: `build`
   *(ou via SSH na raiz do projeto: `npm run build`)*.
3. Clique em **Reiniciar aplicação**.

### 4.5. Confirme

Abra `https://seudominio.com` — você verá a tela do DevGenius V12.
Teste o chat IA e o gerador de esquemáticos para validar a chave Gemini.

---

## 5. Troubleshooting

| Sintoma | Causa / correção |
|---------|-------------------|
| `Cannot find module 'dist/server.cjs'` | Você esqueceu `npm run build` no servidor. |
| Chat IA responde "configure GEMINI_API_KEY" | A variável não foi definida no painel Node.js. Adicione e reinicie. |
| Página em branco / 404 ao recarregar rota interna | O `server.ts` trata o fallback SPA. Verifique se o build gerou `dist/index.html`. |
| Porta ocupada localmente | `PORT=4000 npm run dev` |
| `EACCES` ao bind | Não force `PORT` em produção — deixe a Hostinger gerenciar. |

---

## 6. Estrutura

```
.
├── server.ts                 # Express (API IA + estáticos do build)
├── src/                      # React app
│   ├── App.tsx
│   ├── components/
│   │   ├── AuthPage.tsx      # Login/registro (localStorage)
│   │   └── Dashboard.tsx     # Painel principal
│   └── data/                 # Catálogo de hardware/projetos/quiz
├── public/                   # Estáticos copiados ao dist/
├── vite.config.ts
├── tsconfig.json
├── package.json              # engines.node >= 22
└── .nvmrc                    # 22
```

### Rotas da API

- `POST /api/ai-chat` — chat com Gemini
- `POST /api/ai-schematic` — geração de documentação técnica de hardware
- `POST /api/auth/*` — fluxo de autenticação (mock em `users.json`)
- `GET/POST /api/notes/:username` — bloco de notas por usuário
