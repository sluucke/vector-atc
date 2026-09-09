# Adicionando um aeródromo

Dois comandos e uma revisão manual curta. O grosso do trabalho é automático:
as cartas e a geometria dos procedimentos vêm das *coding tables* do DECEA, que
são a fonte autoritativa de coordenadas e sequência de pernas.

```bash
node scripts/sync-airport.mjs SBGR    # rede: baixa cartas + coding tables
node scripts/build-content.mjs SBGR   # offline: deriva procedimentos + meta
```

Depois disso o aeródromo já aparece na aplicação. O que sobra é revisão.

---

## O que cada script faz

### `sync-airport.mjs <ICAO>` — busca na rede

Consulta a API pública do AISWEB (`area=cartas`) e, para cada carta publicada:

- baixa o PDF para `public/charts/<ICAO>/`
- baixa a *coding table* quando existe e extrai coordenadas WGS84 dos fixos,
  cabeceiras/DER das pistas e a sequência de pernas por transição

Escreve `content/<ICAO>/charts.json` e `content/<ICAO>/geometry.json`.

É o passo lento (dezenas de PDFs). Cartas AOC são ignoradas de propósito — não
se usam em controle e dobrariam o tamanho do repositório.

### `build-content.mjs <ICAO>` — deriva o conteúdo

Lê o que o sync gravou e produz:

- **`procedures.json`** — um registro por SID/STAR, com nome, pista, categoria,
  transições (com distância e restrição de altitude publicadas), lista de fixos
  e as chaves que ligam à carta e à geometria
- **`meta.json`** — criado apenas se não existir, já preenchido com nome,
  elevação, FIR, frequências e pistas vindos do ROTAER, e o ciclo AIRAC da carta
  mais recente

Não faz requisição de rede exceto para o ROTAER na primeira geração do meta.
Pode rodar quantas vezes quiser.

---

## Campos preservados entre execuções

`build-content.mjs` **nunca sobrescreve texto escrito à mão**. Se o
`procedures.json` já existir, estes campos são mantidos:

| Campo | Onde |
|---|---|
| `notes` | SID e STAR |
| `commonRoute` | SID |
| `route`, `iaf`, `entryFixes` | STAR |
| `transitions` | SID (se você reescreveu as descrições) |

O mesmo vale para `meta.json` inteiro: existindo, é preservado.

Ou seja: re-sincronizar num AIRAC novo atualiza cartas e geometria sem apagar a
curadoria.

---

## Revisão manual (o que o script não sabe)

Depois de rodar os dois comandos, abra `content/<ICAO>/meta.json` e resolva os
campos marcados `REVISAR`:

### `ta` e `msa`
Leia de qualquer carta SID do aeródromo — aparecem no cabeçalho
(`TA 7000'`, `MSA 25 NM ... 6000'`).

### `operational.transitionAltitude`
**É o campo mais sensível.** Define o nível de transição calculado pela
Tabela 7 da ICA 100-37, que o controlador informa na frequência.

Use o valor do **MOPS da IVAO** da TMA correspondente, não necessariamente o da
carta — os dois divergem. Em SBSV, por exemplo, a carta do AIRAC 2608A1 publica
TA 10000 ft (o DECEA está harmonizando as TMA para 10.000), enquanto o MOPS da
TMA Salvador usa 7000 ft. Para controlar na rede vale o MOPS.

Registre a origem em `transitionAltitudeSource` e, havendo divergência, guarde a
da carta em `chartTransitionAltitude` com uma nota — a interface mostra as duas.

Se a TA não estiver na Tabela 7 (a tabela cobre 2000–8000 ft), o TL aparece como
`—` em vez de um palpite. Isso é proposital.

### `frequencies.app` e `acc`
O ROTAER às vezes não traz. Leia do cabeçalho da carta.

### `observations`
Notas operacionais que aparecem no painel direito. Coisas que um controlador
precisa saber e não estão estruturadas: pistas de uso militar, procedimentos
só RNAV, fixos compartilhados entre SID de pistas diferentes, perda de
comunicação.

### `ivaoWikiUrl`
Link do MOPS na wiki da IVAO, no formato
`https://wiki.br.ivao.aero/atcops/mops/<fir>/<icao>`.

---

## Conferindo

```bash
npm run build                       # todas as rotas devem gerar
curl localhost:3000/api/airport/SBGR   # TA/TL/QNH/NOTAM/pista em uso
```

Confira na interface:

- o seletor de pista no header detecta alguma pista (ou diz por que não)
- o TL aparece coerente com o QNH do METAR
- os procedimentos da pista em uso vêm primeiro
- abrir uma SID/STAR mostra as abas `CARTA` e `MAPA`
- abrir uma IAC/ADC mostra só `CARTA` (sem coding table não há o que plotar)

---

## Armadilhas conhecidas

**Carta sem coding table.** Só as OMNI. A saída omnidirecional não tem rota
publicada — o piloto sobe na proa da pista e recebe vetoração — então não há o
que plotar, e a carta aparece com `CARTA` apenas. O log marca `(sem coding
table)`.

**Coding table que não parseia.** Não deveria acontecer: o gerador do DECEA
quebra o título em qualquer lugar (`"S" "ID" "RNAV" "EVKOX" "4" "A" "RWY"
"02R"`) e às vezes cola o nome do aeródromo na mesma linha, e o parser remonta
a linha pela distância entre os fragmentos. Se um cabeçalho novo escapar, o
sync mostra `0 proc` e a carta segue navegável, só sem `MAPA`. Compare
`content/<ICAO>/charts.json` com as chaves de `geometry.json` para achar quais.

**Pistas paralelas.** Procedimentos podem servir várias pistas de uma vez
(`11L/11R`). A comparação usa pertencimento, não igualdade — veja
`src/lib/runway-match.ts`.

**Cabeceiras ausentes.** Nem todo aeródromo publica THR nas coding tables de
aproximação; aí só há o DER das SID. A detecção de pista lida com os dois, mas
precisa da pista **recíproca** presente (11L precisa de 29R) para calcular o
rumo.

**Nomes de procedimento.** O `id` sai de nome + tipo (`sid-esbux6a`). Se dois
aeródromos tiverem procedimentos homônimos não há conflito — os arquivos são
por ICAO.

---

## Automatizando para N aeródromos

Os dois scripts recebem o ICAO como argumento e não guardam estado entre
execuções, então um laço resolve:

```bash
for icao in SBGR SBSP SBRJ SBGL SBCF; do
  node scripts/sync-airport.mjs "$icao"
  node scripts/build-content.mjs "$icao"
done
```

Dois cuidados:

1. **Peso do repositório.** SBSV são ~33 MB de PDF, SBBR ~78 cartas. Com dezenas
   de aeródromos convém mover os PDFs para blob storage em vez de versioná-los.
2. **Revisão não escala sozinha.** A TA operacional e as observações continuam
   exigindo leitura do MOPS. Rodar o laço deixa os aeródromos navegáveis, mas
   até a revisão o TL vai aparecer como `—` (porque `transitionAltitude` fica 0).

Para re-sincronizar tudo num AIRAC novo, o mesmo laço serve — o conteúdo
editorial é preservado.
