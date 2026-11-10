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
- As cartas **REA** não estão na API do AISWEB. `npm run sync:rea` lê a tabela
  HTML da página de cartas visuais e distribui cada folha para os aeródromos da
  TMA.
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
- `cruise-level.ts`: nível de cruzeiro contra a regra semicircular e o RVSM. O
  rumo da rede é verdadeiro, então a declinação do aeródromo é aplicada antes.
  Perto do limite entre semicírculos a regra não é aplicada.
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
