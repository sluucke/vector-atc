# Contribuindo com o Vector ATC

Obrigado por querer ajudar. Este guia explica como montar o ambiente, o que
esperamos de uma contribuição e como os dados aeronáuticos são tratados.

Ao participar, você concorda com o [código de conduta](CODE_OF_CONDUCT.md).

## Formas de contribuir

- **Relatar um problema**: abra uma *issue* com o modelo de bug. Diga o
  aeródromo, o que você esperava e o que viu.
- **Corrigir um dado**: frequência, TA, observação ou procedimento errado.
  Cite a fonte (carta DECEA com AIRAC, MOPS da TMA, ROTAER).
- **Adicionar um aeródromo**: siga
  [Adicionando um aeródromo](docs/adicionando-aerodromos.md).
- **Código**: correções e novos recursos. Para mudanças grandes, abra uma
  *issue* antes para combinar a abordagem.

## Ambiente

Requer Node.js 20.9 ou mais recente.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Nenhuma variável é obrigatória. Veja o [README](README.md#rodando-localmente)
para o que cada uma liga.

## Antes de abrir um pull request

Rode e deixe passando:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Teste a mudança no navegador, no desktop e numa largura de celular. A
interface tem três colunas no desktop e abas no celular.

## Estrutura do código

```
src/
  app/            rotas do Next.js (páginas e API)
  components/     interface, separada por área:
    airport/        cabeçalho, pista em uso, seleção de aeródromo
    charts/         visualizador de carta, mapa, lista de procedimentos
    ivao/           tráfego e status da conta IVAO
    layout/         barra lateral, topo, abas do celular, busca
    operations/     painel operacional e NOTAM
    reference/      fraseologia e circuito de tráfego
    ui/             componentes genéricos
  providers/      contextos React (aeródromo, sessão IVAO)
  lib/            lógica sem interface:
    charts/         inventário e relevância das cartas
    ivao/           OAuth, whazzup, tráfego, associação de procedimento
    ops/            METAR, NOTAM, pista, nível de transição e de cruzeiro
    reference/      conteúdo de fraseologia e circuito
scripts/          sincronização com o AISWEB (rodam com tsx)
content/<ICAO>/   dados gerados e editoriais de cada aeródromo
public/charts/    PDFs das cartas
docs/             documentação
```

Mais detalhes em [docs/arquitetura.md](docs/arquitetura.md).

## Convenções

- **TypeScript** em todo o código, inclusive os scripts.
- Importe de outra pasta com o alias `@/`; arquivos da mesma pasta, com `./`.
- Módulos que acessam a rede ou segredos importam `server-only`.
- Comentários explicam o **porquê**, não o quê. Siga a densidade do código ao
  redor.
- Texto da interface em português. Código, comentários e mensagens de commit
  em inglês.
- Commits pequenos, com mensagem no imperativo descrevendo a mudança.

## Dados aeronáuticos

O projeto mexe com informação que um controlador usa para decidir. Por isso:

- **Nunca invente um dado.** Se a fonte não publica uma frequência, uma TA ou
  um curso, deixe o campo vazio. A interface mostra `—` com o motivo.
- **Cite a fonte.** Campos editoriais em `meta.json` têm um par `...Source`
  para isso.
- **Fonte primária:** cartas e ROTAER do DECEA no AISWEB. Para regras da rede,
  o MOPS da TMA na wiki da IVAO Brasil.
- Dados gerados (`charts.json`, `geometry.json`) não são editados à mão: rode
  os scripts. Os campos editoriais (`notes`, `observations`, TA operacional)
  são preservados entre execuções.

## Licença

Ao contribuir, você concorda que seu código seja distribuído sob a
[licença MIT](LICENSE). Dados do DECEA continuam pertencendo ao DECEA.
