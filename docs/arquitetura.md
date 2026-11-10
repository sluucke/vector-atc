# Arquitetura

Visão geral de como o Vector ATC obtém, guarda e mostra os dados.

## Dois tipos de dado

**Estático**: muda a cada ciclo AIRAC (28 dias). Cartas, coordenadas dos
fixos, sequência de pernas dos procedimentos, frequências, TA. É gerado por
scripts e versionado no repositório.

**Dinâmico**: muda durante a sessão. METAR, NOTAM, pista em uso, tráfego da
rede. Vem de rotas de API consultadas pelo navegador.

## Dados estáticos

```
AISWEB (DECEA)
  │  npm run sync:airport -- <ICAO>      scripts/sync-airport.ts
  ▼
public/charts/<ICAO>/*.pdf              PDFs das cartas
content/<ICAO>/charts.json              catálogo das cartas
content/<ICAO>/geometry.json            fixos, cabeceiras, cursos e pernas
  │  npm run build:content -- <ICAO>     scripts/build-content.ts
  ▼
content/<ICAO>/procedures.json          um registro por SID/STAR
content/<ICAO>/meta.json                nome, TA, frequências, observações
```

- A **geometria** vem das *coding tables* do DECEA, que são a fonte
  autoritativa de coordenadas. O parser (`scripts/lib/pdf.ts`) reconstrói as
  células da tabela pela distância entre os fragmentos de texto do PDF.
- As cartas **da TMA** (ARC, ATCSMAC e REA) vêm de `npm run sync:tma`. ARC e
  ATCSMAC estão na API do AISWEB sob o código da TMA (SBWR para Brasília). As
  REA não estão na API: o script lê a tabela HTML da página de cartas visuais.
  Cada folha é copiada para todos os aeródromos da TMA.
- As **aerovias** vêm de `npm run sync:airways`, que lê o AIP completo. A ENR
  3.1 e a ENR 3.2 listam cada trecho com rumo magnético, limites e, em colunas
  Ímpar e Par, uma seta para o sentido em que cada paridade vale (↓ na ordem da
  tabela, ↑ ao contrário). A ENR 4.4 dá as coordenadas de todos os fixos.
  Resultado: `content/airways.json`.
- Os **planos regulares** vêm de `npm run sync:rpl`, que baixa o RPL da CGNA
  (o arquivo que as empresas aéreas filam para voos regulares) e resume por par
  de aeródromos: níveis usados e rotas mais filadas. Resultado:
  `content/rpl.json`. `npm run check:airways` cruza os dois e deve ficar acima
  de 97% de concordância.
- A **sobreposição de cartas** vem de `npm run georef:charts`. Cada fixo que
  a carta nomeia e cuja coordenada é conhecida vira ponto de controle; um
  ajuste norte-acima (escala e deslocamento, com RANSAC) leva a página para
  Web Mercator, e um segundo passo troca o rótulo pelo símbolo do fixo. Só
  ficam as páginas em que metade dos fixos concorda e o erro fica abaixo de
  1 km. Resultado: `content/<ICAO>/georef.json`; o mapa desenha a página com
  pdf.js e uma matriz CSS.
- As **frequências IVAO** (APP e centro) vêm de `npm run sync:frequencies`,
  separadas das frequências da carta.
- Campos editoriais (`notes`, `observations`, TA operacional, link do MOPS) são
  escritos à mão e preservados quando os scripts rodam de novo.

`src/lib/content.ts` lê esses arquivos no servidor. Com eles o Next.js gera,
no build, uma página estática por aeródromo, por carta e por procedimento.

## Dados dinâmicos

| Rota | Fonte | Cache | Consulta do navegador |
|---|---|---|---|
| `GET /api/airport/[icao]` | METAR e NOTAM do AISWEB e da IVAO, ATIS do whazzup | METAR 5 min, NOTAM 15 min | a cada 60 s |
| `GET /api/ivao/traffic?icao=` | whazzup da IVAO | 15 s, compartilhado | a cada 20 s |
| `GET /api/ivao/session` | sessão do usuário e posição ATC | — | a cada 30 s |
| `GET /api/ivao/login`, `callback`, `POST logout` | OAuth da IVAO | — | — |

`/api/airport/[icao]` consolida tudo numa chamada. Cada fonte falha sozinha:
sem METAR, o resto do painel continua. O formato da resposta está em
`src/lib/ops/briefing.ts`.

## Regras operacionais

Em `src/lib/ops/`, sem interface, testáveis isoladamente:

- `transition.ts`: nível de transição pela Tabela 7 da ICA 100-37. Nunca
  extrapola: TA fora da tabela devolve "sem nível".
- `runway.ts`: pista em uso pelo ATIS do controlador ou, sem ATIS, pelo vento
  do METAR contra o curso publicado da pista.
- `airways.ts`: lê a rota filada contra as aerovias. Para cada trecho de
  aerovia, a paridade vem da tabela do AIP no sentido voado. Para cada perna
  direta, do rumo magnético entre os dois fixos, com a declinação medida no
  próprio AIP (a diferença entre o rumo publicado e o rumo verdadeiro do
  trecho de aerovia mais próximo).
- `cruise-level.ts`: decide o nível de cruzeiro nesta ordem: aerovias do AIP,
  pernas diretas da rota, rumo entre o aeródromo e a aeronave, planos regulares
  da CGNA. Quando o AIP e os planos regulares divergem, o resultado vira
  ressalva em vez de erro. Também confere RVSM e VFR.
- `rpl.ts`: resume os planos regulares de um par de aeródromos.
- `notam.ts`, `metar.ts`: AISWEB com cache.

Em `src/lib/ivao/`:

- `whazzup.ts`: uma requisição compartilhada por todo o servidor, respeitando
  o intervalo mínimo de 15 s da IVAO.
- `procedure-match.ts`: associa a rota do plano de voo a um procedimento,
  como **confirmado** (o designador está na rota) ou **inferido** (pelo fixo de
  entrada ou saída).
- `oidc.ts`, `session.ts`: login OAuth com PKCE. A sessão fica num cookie
  criptografado (JWE).

## Interface

- `src/app/[icao]/layout.tsx` monta o console: barra lateral, topo,
  cabeçalho do aeródromo e as três colunas (procedimentos, conteúdo, painel).
- `src/providers/AirportContextProvider.tsx` guarda o estado do aeródromo:
  dados dinâmicos, pista em uso escolhida, filtro de categorias. Todas as
  colunas leem dele, então um filtro vale para a tela inteira.
- No celular, as três colunas viram abas (`components/layout/MobilePanes.tsx`).
- A carta é desenhada com pdf.js (`components/charts/PdfCanvas.tsx`). O mapa
  dos procedimentos usa Leaflet (`components/charts/ProcedureMap.tsx`).

## Design

Tokens de cor, tipografia e espaçamento em `src/app/globals.css`. As
especificações de origem estão em [design/](design/).
