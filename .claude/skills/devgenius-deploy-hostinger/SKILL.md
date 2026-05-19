---
name: devgenius-deploy-hostinger
description: Checklist de deploy do DEVGENIUS na Hostinger (plano Node.js). Gera ZIP correto pra upload via File Manager, lista variáveis de ambiente, e cobre os erros comuns do shim ESM→CJS, GEMINI_API_KEY e PORT.
---

Use esta skill quando o usuário pedir para deployar, atualizar produção, gerar build pra upload, ou debugar problema de runtime na Hostinger.

## Pré-requisitos do plano Hostinger

- Plano com suporte a **Node.js** (Cloud Startup/Business Cloud/VPS — shared comum NÃO serve)
- Versão Node.js: **22.x**
- Modo aplicação: `Production`
- Framework: `Express`

## Gerar o pacote para upload

O ZIP deve conter o **código-fonte** (sem `node_modules/`, sem `dist/`, sem `users.json`, sem `server.cjs`, sem `.env`). A Hostinger vai rodar `npm install` e `npm run build` no servidor depois do upload.

```bash
cd "/Users/viniciusvmorais/VS Code/GeniusOS"
TS=$(date +%Y%m%d-%H%M)
ZIP="/tmp/devgenius-hostinger-$TS.zip"

zip -r "$ZIP" \
  package.json package-lock.json \
  server.ts server.js \
  tsconfig.json vite.config.ts \
  index.html metadata.json \
  .nvmrc .env.example \
  public src README.md CLAUDE.md \
  -x "node_modules/*" "dist/*" ".git/*" ".claude/*" \
     "*.log" "users.json" "users.json.codes" "server.cjs" \
     ".env" ".DS_Store" "standalone.html"

ls -lh "$ZIP"
```

Resultado típico: ~5-7 MB (sem node_modules, com imagens em public/img/).

## Subir e configurar no hPanel

1. **Upload**:
   - Opção A (recomendada): conectar GitHub via painel ou `git clone` via SSH
   - Opção B: File Manager → upload do ZIP → extrair em `domains/<seu-dominio>/public_html/`

2. **Criar app Node.js**:
   - hPanel → Avançado → Node.js → Criar aplicação
   - Versão: `22.x`
   - Modo: `Production`
   - Framework: `Express`
   - Raiz: caminho da pasta (ex: `public_html`)
   - URL: seu domínio
   - **Arquivo de inicialização**: `server.js` (não `server.cjs` — o painel insiste em `server.js` em muitos planos; o shim resolve isso)

3. **Variáveis de ambiente** (na tela do app Node.js):

   | Nome | Valor |
   |---|---|
   | `GEMINI_API_KEY` | sua chave Gemini (https://aistudio.google.com/apikey) |
   | `NODE_ENV` | `production` |

   **NUNCA** definir `PORT` — Hostinger injeta automaticamente. Definir manualmente quebra o app.

4. **Build no servidor**:
   - Painel → Executar NPM Install (ou SSH: `npm install`)
   - Painel → Executar script NPM → `build` (ou SSH: `npm run build`)
   - Confirmar que gerou `dist/index.html` e `server.cjs` na raiz

5. **Reiniciar aplicação** no painel

## Validação pós-deploy

Abrir `https://seu-dominio.com`:
- Tab do navegador deve mostrar: "DEVGENIUS — Plataforma de Engenharia de Hardware e Software"
- Catálogo de placas deve mostrar imagens reais (não logo placeholder)
- Chat IA: enviar "Como ligar um LED?" — deve responder com texto da Gemini
- Se chat responder "DevGenius IA temporariamente indisponível": `GEMINI_API_KEY` não foi configurada ou está inválida

## Erros comuns

| Sintoma | Causa | Fix |
|---|---|---|
| `Cannot find module 'server.cjs'` ou `Cannot find module 'dist/server.cjs'` | Esqueceu `npm run build` no servidor | Painel → Executar script NPM → `build` |
| Painel diz que entry é `server.js` e app não sobe | Esperado: o shim `server.js` carrega `server.cjs`. Garanta que `npm run build` foi executado | Build no servidor |
| Chat IA responde "indisponível" | `GEMINI_API_KEY` não foi definida ou expirou | Painel → Variáveis de Ambiente → adicionar + reiniciar |
| Página em branco / 404 ao recarregar rota interna | `dist/index.html` faltando ou `server.cjs` não está servindo o fallback SPA | Rebuild + reiniciar |
| `EACCES` no bind da porta | Definiu `PORT` manualmente | Remover PORT das envs, reiniciar |
| Senhas antigas não logam | `users.json` é re-inicializado vazio em fresh deploy — usuários antigos não migram | Avisar: cadastrar de novo. Migrar dados via SSH se houver dados em prod. |
| Imagens 404 | Build não copiou `public/img/` | Confirmar que `public/` foi incluído no upload; rebuild |

## Estrutura mínima esperada no servidor

```
public_html/
├── package.json
├── package-lock.json
├── server.ts          # fonte
├── server.js          # shim ESM (entry da Hostinger)
├── server.cjs         # GERADO pelo build no servidor — não subir do laptop
├── tsconfig.json
├── vite.config.ts
├── index.html
├── metadata.json
├── .nvmrc
├── public/            # incl. img/
├── src/               # React app
└── dist/              # GERADO pelo build no servidor
```

Arquivos a NÃO subir do laptop: `node_modules/`, `dist/`, `server.cjs`, `users.json`, `.env`, `.git/`, `.claude/`, `standalone.html`.

## Notas sobre o auth

O cliente usa **localStorage** para auth — cada navegador/dispositivo tem suas próprias contas. **Senhas não sincronizam** entre dispositivos. Limpar cache = perder contas locais. Migrar para auth server real (Supabase recomendado) é prioridade do Roadmap A+C.
