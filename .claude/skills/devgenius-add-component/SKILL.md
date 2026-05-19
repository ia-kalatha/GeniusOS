---
name: devgenius-add-component
description: Adicionar um novo componente/placa ao catálogo do DEVGENIUS (src/data/hardware.ts). Inclui busca de imagem real (Wikimedia Commons), otimização com sips, validação de falsos positivos comuns e atualização da entrada no array correto (DATA_PLACAS, DATA_COMPONENTES ou DATA_PC_HARDWARE).
---

Use esta skill quando o usuário pedir para adicionar/criar um novo componente, placa ou item ao catálogo do DEVGENIUS.

## Passo a passo

### 1. Identificar a categoria
- **Placa** (microcontrolador, SBC): `DATA_PLACAS` → `public/img/placas/<slug>.jpg`
- **Componente** (sensor, atuador, módulo, display): `DATA_COMPONENTES` → `public/img/componentes/<slug>.jpg`
- **PC hardware**: `DATA_PC_HARDWARE` → `public/img/pcs/<slug>.jpg` (⚠️ categoria marcada pra cortar no roadmap — confirmar com usuário antes)

### 2. Coletar metadados
Pergunte ao usuário se não tiverem:
- `nome` exato (ex: "Sensor de Humidade DHT22")
- `tipo`: `"Básica" | "Especial" | "Normal" | "Avançado" | "PC Master"`
- `info` (descrição rica de 1-2 parágrafos)
- `resumo` (uma frase curta — opcional)
- `descricao_faq` (didática para iniciante — opcional)
- `forma_uso` (instrução prática — opcional)
- `specs` (objeto com voltagem/pinagem/criacao/baseCode/performance/consumo)

### 3. Buscar e baixar a imagem (Wikimedia Commons)

```bash
# Busca via API
UA="DevGeniusV12-Educational/1.0"
TERM="DHT22 sensor"  # termo de busca específico
SLUG="dht22"
CATEGORIA="componentes"  # placas|componentes|pcs|projetos

# 1. Pega título do 1º hit (filtro filetype:bitmap evita PDFs)
TITLE=$(curl -s -A "$UA" "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=3&srsearch=filetype:bitmap%20$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$TERM")" | python3 -c "import sys,json; d=json.load(sys.stdin); [print(h['title']) for h in d.get('query',{}).get('search',[]) if not h['title'].lower().endswith('.pdf')][:1]")

# 2. URL real via imageinfo
URL=$(curl -s -A "$UA" "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$TITLE")" | python3 -c "import sys,json; d=json.load(sys.stdin); p=list(d.get('query',{}).get('pages',{}).values()); print(p[0]['imageinfo'][0]['url'])")

# 3. Baixa e otimiza
cd "public/img/$CATEGORIA"
curl -sL -A "$UA" "$URL" -o "$SLUG.tmp"
sips -Z 600 -s formatOptions 75 "$SLUG.tmp" --out "$SLUG.jpg"
rm "$SLUG.tmp"
```

### 4. Validar visualmente (CRÍTICO)

Wikimedia tem **falsos positivos comuns** com termos eletrônicos:
- "MQ-2 sensor" pode retornar drone "Ikhana MQ-1 Predator"
- Termos militares retornam fotos de drones/equipamentos militares
- Siglas curtas retornam PDFs académicos (mesmo com `filetype:bitmap`)

**Sempre conferir o nome do arquivo retornado** antes de incluir no catálogo. Se for falso positivo:
1. Refazer busca com termo mais específico (ex: "DHT22 temperature humidity sensor module")
2. Se mesmo assim não achar imagem real, usar placeholder: `image: "/img/componentes/_placeholder.svg"`

### 5. Editar `src/data/hardware.ts`

Adicionar entrada no array correto. ID sequencial (próximo após o último: `p1, p2, ...` para placas, `c1, c2, ...` para componentes, `h1, h2, ...` para PCs). Formato:

```typescript
{
  id: "c52", nome: "Sensor XYZ", tipo: "Normal",
  info: "Descrição rica...",
  resumo: "Uma frase.",
  forma_uso: "Como usar.",
  image: "/img/componentes/sensor-xyz.jpg",
  specs: { voltagem: "5V", pinagem: "4 pinos", criacao: "..." }
},
```

### 6. Validar e mostrar

```bash
npm run lint  # tsc --noEmit
```

Recarregar o navegador e abrir a categoria pra ver o item novo. Confirmar com o usuário se a imagem ficou correta.

## Anti-padrões a evitar

- ❌ NÃO usar URLs externas (mlstatic.com, fabricante) — risco link break, CORS, hotlinking
- ❌ NÃO incluir imagem sem validação visual — falsos positivos quebram credibilidade
- ❌ NÃO escrever descrições genéricas tipo "componente eletrônico do ecossistema X" — preferir 30 itens curados a 100 genéricos (ver memory feedback_no_fake_content)
- ❌ NÃO usar tom techno-supremacy ("kernel V12", "cortex") — tom é educacional sóbrio desde commit 7a8a289

## Convenções específicas

- Strings em **pt-BR**
- Difficulty (em projects.ts): apenas `"Básico" | "Intermediário" | "Avançado" | "Expert"`
- Imagens otimizadas com `sips -Z 600 -s formatOptions 75` (max 600px, JPEG 75%)
- Slug em kebab-case ASCII (sem acento) — `dht22.jpg`, `servo-mg996r.jpg`
