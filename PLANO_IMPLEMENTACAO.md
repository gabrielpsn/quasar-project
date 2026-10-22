# Plano de Implementação — Finance App 100% Frontend e Offline

> Documento gerado a partir da análise do projeto `quasar-project` (Quasar 2 / Vue 3 / Vite)
> e da implementação de referência `gemini-code-1790710569829.html` (v22.0).
> Data-base da análise: 22/10/2026.

---

## 1. Diagnóstico do estado atual

### 1.1 O que já existe no projeto Quasar

| Módulo | Arquivo | Situação |
|---|---|---|
| Layout / navegação | `src/layouts/MainLayout.vue` | Funciona, mas o menu aponta para `/reports` e `/budgets` — **rotas inexistentes** (caem no 404) |
| Dashboard | `src/pages/IndexPage.vue` | Cards de balance/income/expenses com **barras de progresso hardcoded** (`:value="0.7"`, `:value="0.5"`) |
| Transações | `src/pages/TransactionsPage.vue` | CRUD completo, **100% dependente de API** |
| Categorias | `src/pages/CategoriesPage.vue` | CRUD completo, **100% dependente de API** |
| Metas | `src/pages/GoalsPage.vue` + `src/components/GoalCard.vue` | CRUD completo, **100% dependente de API** |
| Auth | `src/stores/auth.js`, `LoginPage`, `RegisterPage`, `ForgotPasswordPage` | `axios` → `http://localhost:3000/api`; token em `localStorage` |
| Boot HTTP | `src/boot/axios.js` | Interceptor global com `logout()` + `window.location.href` no 401 |
| Rotas | `src/router/routes.js` / `src/router/index.js` | Guard de autenticação, `vueRouterMode: 'hash'` |
| i18n | `src/i18n/` | Apenas `en-US` com 2 chaves; **nenhuma string da UI foi i18nizada** |
| Moeda | `GoalCard.vue:227` | Formatado em **USD** (`en-US`, `$`) — incorreto para o domínio |

**Dependências atuais:** `quasar`, `vue`, `pinia`, `vue-router`, `vue-i18n`, `axios`, `@quasar/extras`.
Não há `chart.js`, não há Tailwind, não há PWA configurado (`quasar.config.js` tem o bloco `pwa:` sem `workboxOptions`).

### 1.2 Lacunas técnicas que travam o requisito "offline"

1. **Todos os stores chamam `api.get/post/put/delete`.** Sem backend, a aplicação não carrega nada — o dashboard fica vazio e o guard de rota expulsa o usuário para `/login`.
2. **Nenhum mecanismo de persistência em arquivo.** O `localStorage` do HTML do Gemini não atende ao requisito de "gravar em txt".
3. **`axios` está no bundle** (≈13 KB gzip) sem nenhuma utilidade no modo offline.
4. **`remote-profile/`** (perfil do Chromium, centenas de arquivos) está versionado no repositório — precisa sair.
5. **`src/services/api.js`** foi removido no working tree e não é importado por ninguém — ok, mas o `boot/axios.js` continua registrado.
6. **Sem `chart.js`** — o HTML do Gemini usa CDN, o que quebra o offline.
7. **Falta `pt-BR`** e toda a UI está em inglês hardcoded.

### 1.3 O que o HTML do Gemini (v22.0) implementa

6 abas + 3 modais, com `localStorage` (`fin_db_v22`, `inv_db_v22`) e flags de pagamento por índice.

| Aba | Recursos |
|---|---|
| **Fluxo de Caixa & Meses** | Tabs por mês; entradas nos dias 10/15/30; lançamentos agrupados por vencimento (1/10/15/30); checkbox "pago" com **data de pagamento**; **transferência de pendências do mês anterior**; saldo por dia (Sobra/Déficit) |
| **Quitação & Simulador** | Valor extra → amortização sobre `Empréstimo` + `Cartão` ordenados por maior valor (avalanche) |
| **Gestão de Cartões** | Total faturado por cartão, extraído por regex `\[Cartão (.*?)\]` da descrição |
| **Investimentos & Reserva** | Carteira de FIIs (ticker/tipo/cotas/preço médio); calculadora de renda passiva (DY fixo de 1%/mês); sugestões de ativo para reserva (Tesouro Selic, CDB, conta remunerada) |
| **Previsão & Futuro** | Bloco de **texto 100% hardcoded**, sem cálculo real |
| **Metas & Patrimônio** | Metas e ativos listados como **HTML estático**, sem CRUD |

### 1.4 Bugs do HTML do Gemini a não reproduzir na porta

| # | Bug | Local | Correção proposta |
|---|---|---|---|
| B1 | Lê `cardInstallments` mas o input é `cardInstallmentCount` → parcelamento **sempre cai no fallback de 2 parcelas** | `handleNewLaunch` (L880) | Campo único `parcelas` validado |
| B2 | Carry-over grava `v22_carry_{mes}_{i}` mas consulta `v22_{mesAnterior}_item_{i}` → **checkbox de pendência nunca persiste** | `getUnpaidItems` (L954) vs `toggleCheck` (L987) | IDs estáveis (UUID) em vez de índice |
| B3 | `switchPage` usa o `event` global implícito → quebra em Firefox | L551 | Passar o evento via arrow function |
| B4 | `mesData.itens.indexOf(item)` para recuperar o índice → frágil | L1156 | Iterar com `map`/`entries` preservando o id |
| B5 | `renderProjecao()` devolve texto fixo | L727 | Motor de projeção real com cenários |
| B6 | `localStorage.clear()` no reset apaga **todos** os dados do navegador | L535 | Remover apenas as chaves do app |
| B7 | Mês criado por parcelamento nasce com entradas padrão erradas (Outubro) | L867, L898 | Meses novos nascem vazios + ação "clonar mês anterior" |
| B8 | `updateEntrada` re-renderiza a app inteira e devolve o foco ao input | L853 | Atualização reativa sem re-render global |
| B9 | Cartões são deduzidos de texto livre (regex) — renomear o cartão quebra o histórico | L700 | `cartaoId` como foreign key |
| B10 | `dyMedioMensal = 0.01` fixo na meta de renda passiva | L643 | DY real por ativo + DY médio ponderado da carteira |
| B11 | Dependências via CDN (Tailwind, FontAwesome, Chart.js) | `<head>` | Pacotes npm empacotados (offline real) |

---

## 2. Objetivo e decisões de arquitetura

### 2.1 Objetivo

Aplicação Quasar **SPA, 100% frontend, 100% offline**, que:
- funcione sem backend e sem rede (instalável como PWA);
- persista **todos os dados em arquivos `.txt`** no disco do usuário;
- integre o fluxo de caixa do Gemini v22.0 com o CRUD de transações/categorias/metas já existente no Quasar;
- adicione o conjunto de novas funcionalidades da Seção 5.

### 2.2 Decisões (ADR resumido)

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | **File System Access API** como adaptador primário de arquivos | apenas `localStorage` | Grava `.txt` **de verdade** no disco do usuário, com handle persistido |
| D2 | **OPFS** como adaptador secundário | `localStorage` | Firefox/Safari gravam arquivos reais sem pedir permissão; cobre 100% dos navegadores modernos |
| D3 | **Download `.txt` via Blob** como fallback manual | nada | Funciona em qualquer navegador; export/import explícito |
| D4 | Formato **JSON legível dentro de `.txt`**, com header `# schema:` / `# updatedAt:` | JSON binário/LevelDB | Requerido "txt", inspecionável, diffável, editável à mão |
| D5 | **NDJSON append-only** para `historico.txt` (journal de auditoria + undo/redo) | snapshot único | Grava incremental sem reescrever o arquivo inteiro |
| D6 | IDs **estáveis (UUID)** em todos os registros | índice do array | Elimina B2/B4; editar/excluir não corrompe estado |
| D7 | **Quasar Components + SCSS**, sem Tailwind | Tailwind (como no HTML) | Um só design system, menos bytes, offline por construção, pronto para i18n/RTL |
| D8 | `chart.js` como **dependência npm** (empacotada) | CDN | Offline real; sem requisição externa em runtime |
| D9 | Camada de **repositórios** sobre o storage, Pinia só como cache reativo | Lógica de storage dentro das actions | Testabilidade, troca de adaptador sem tocar nas telas |
| D10 | Remover `axios` do bundle; manter `boot/axios.js` apenas como stub inerte | Manter axios | -13 KB gzip, zero dependência de rede |

### 2.3 Compatibilidade de navegadores (camada de persistência)

| Navegador | FSA | OPFS | Fallback download | Resultado |
|---|---|---|---|---|
| Chrome / Edge / Opera (86+) | ✅ | ✅ | ✅ | Persistência automática em disco |
| Safari (15.2+) | ❌ | ✅ | ✅ | Persistência automática em sandbox |
| Firefox (111+) | ❌ | ✅ | ✅ | Persistência automática em sandbox |
| Navegador antigo / modo restrito | ❌ | ❌ | ✅ | Export/import manual de `.txt` |

---

## 3. Camada de persistência em TXT

### 3.1 Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  Pages / Components (Vue)                                   │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Pinia stores (cache reativo)                               │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Repositories  (monthsRepo, cardsRepo, debtsRepo, ...)      │
│  → API: load() · save(data) · export() · import()            │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  fileStorage.js  (facade + fila de escrita serializada)     │
│  debounce 800ms · backup .bak · flush on hide/unload        │
└───┬───────────────┬────────────────┬────────────────────────┘
    │               │                │
┌───▼──────┐ ┌──────▼───────┐ ┌──────▼────────┐
│ FSA      │ │ OPFS         │ │ Download      │
│ (disco)  │ │ (sandbox)    │ │ (manual)      │
└──────────┘ └──────────────┘ └───────────────┘
```

### 3.2 Mapa de datasets → arquivos

Todos os arquivos usam extensão `.txt` e residem na **mesma pasta** escolhida pelo usuário (FSA) ou na raiz do OPFS.

| Dataset | Arquivo | Conteúdo |
|---|---|---|
| Perfil / autenticação local | `perfil.txt` | Nome, e-mail, moeda, locale, tema, hash de senha (opcional) |
| Fluxo de caixa (núcleo) | `fluxo-caixa.txt` | Meses, entradas, lançamentos, status/data de pagamento |
| Cartões de crédito | `cartoes.txt` | Cartões, limite, fechamento, vencimento, bandeira |
| Dívidas | `dividas.txt` | Empréstimos/financiamentos, saldo devedor, taxa, parcelas |
| Investimentos | `investimentos.txt` | FIIs, caixa, preço médio/atual, DY, dividendos |
| Metas | `metas.txt` | Metas, aportes planejados, progresso |
| Patrimônio | `patrimonio.txt` | Ativos e passivos, snapshots históricos |
| Preferências / recorrências | `preferencias.txt` | Categorias, regras de recorrência, metas de reserva |
| Histórico (journal) | `historico.txt` | NDJSON append-only: cada operação com `before`/`after` |

### 3.3 Formato do arquivo (exemplo real)

`fluxo-caixa.txt`:

```
# finance-app/fluxo-caixa
# schema: 2
# updatedAt: 2026-10-22T14:03:11.000Z
{
  "meses": [
    {
      "id": "2026-10",
      "rotulo": "Outubro 2026",
      "entradas": [
        { "id": "e-001", "dia": 10, "valor": 2500.00, "desc": "Salário" },
        { "id": "e-002", "dia": 15, "valor": 3305.00, "desc": "Salário" },
        { "id": "e-003", "dia": 30, "valor": 1852.00, "desc": "13º / férias" }
      ],
      "itens": [
        {
          "id": "i-8f2a",
          "desc": "Parcela Carro",
          "valor": 1540.00,
          "categoria": "Fixo",
          "vencimentoDia": 10,
          "mesRef": "2026-10",
          "origem": { "tipo": "recorrencia", "parentId": "d-001" },
          "parcelas": { "total": 48, "atual": 12, "valorParcela": 1540.00 },
          "pago": true,
          "dataPagamento": "2026-10-05",
          "valorPago": 1540.00
        }
      ]
    }
  ]
}
```

`historico.txt` (NDJSON, uma linha por operação):

```
{"ts":"2026-10-22T14:03:11.412Z","op":"update","entity":"item","id":"i-8f2a","before":{"pago":false},"after":{"pago":true,"dataPagamento":"2026-10-05"}}
{"ts":"2026-10-22T14:05:02.100Z","op":"create","entity":"card","id":"c-77b1","after":{"nome":"Nubank Gabriel","limite":8000}}
```

### 3.4 Regras de escrita

- **Fila serializada por dataset** — nenhuma escrita concorrente no mesmo arquivo.
- **Debounce de 800 ms** por dataset + flush imediato em `visibilitychange`, `pagehide` e `beforeunload`.
- **Backup `.bak`** gerado antes de sobrescrever; rotação das 3 últimas versões.
- **Escrita atômica**: FSA e OPFS `createWritable()` trocam o arquivo ao fechar; falha mantém a versão anterior íntegra.
- **Header de schema** em cada arquivo → migrações em cascata (`src/services/storage/migrations.js`) quando o `schema` for < versão atual.
- **Snapshot automático diário** de todos os datasets em `snapshots/AAAA-MM-DD.txt`.
- **Sem `localStorage` para dados** — usado apenas para cache de preferências de UI e handle de arquivo (IndexedDB para o handle).

### 3.5 Contratos (API) da camada

```js
// src/services/storage/fileStorage.js
export const fileStorage = {
  async init(): Promise<{ mode: 'fsa' | 'opfs' | 'download', rootName: string }>,
  async pickLocation(): Promise<void>,            // FSA: abre o seletor de pasta
  async load(dataset: string): Promise<object>,   // { data, schema, updatedAt }
  async save(dataset: string, data: object): Promise<void>,
  async loadAll(): Promise<Record<string, object>>,
  async exportBundle(): Promise<void>,            // download de um .txt único com todos os datasets
  async importBundle(file: File): Promise<void>,
  async status(): Promise<{ mode, writable, datasets: string[] }>
}
```

---

## 4. Modelo de dados

O modelo atual (`transactions` com `date/amount/type/category`) **não captura** entradas por dia de recebimento, vencimento ≠ data, status de pagamento com data real, relacionamento com cartão/dívida, nem parcelamento. O novo modelo:

```
Month
├── id: "2026-10" · rotulo · entradas[] · itens[]
├── entradas: { id, dia(1|10|15|30), valor, desc }
└── itens:
    Item {
      id, desc, valor, categoria('Fixo'|'Empréstimo'|'Cartão'|'Variável'),
      vencimentoDia(1|10|15|30), mesRef, diaPagamento?,
      origem: { tipo:'manual'|'parcelamento'|'recorrencia'|'importacao', parentId? },
      parcelas?: { total, atual, valorParcela },
      cartaoId?, dividaId?,
      pago, dataPagamento, valorPago
    }

Cartao  { id, nome, bandeira, limite, diaFechamento, diaVencimento, cor }
Divida  { id, nome, tipo('emprestimo'|'financiamento'|'cartao'),
          saldoDevedor, taxaJurosMensal, valorParcela, parcelasPagas, parcelasTotal, quitada }
Investimento { id, ticker, tipo, cotas, precoMedio, precoAtual?, dyMensal?, classe('FII'|'RendaFixa'|'Acao'|'ETF') }
Meta    { id, nome, tipo('reserva'|'projeto'|'renda-passiva'), alvo, atual, prazo, aportesPrevistos[] }
Ativo   { id, nome, tipo('imovel'|'veiculo'|'outro'), valorEstimado,/passivoVinculado? }
Passivo { id, nome, saldo, taxaJurosMensal? }
```

**Mudanças-chave em relação ao Gemini:** status de pagamento deixa de ser uma flag por índice e passa a ser um campo do item com **id estável**; cartões passam a ser entidades com FK (elimina B9); parcelas viram estrutura (elimina B1); a projeção vira cálculo real (elimina B5).

---

## 5. Funcionalidades — mapeamento e novidades

### 5.1 Migradas do Gemini v22.0

| # | Funcionalidade | Origem | Destino no Quasar |
|---|---|---|---|
| M1 | Fluxo de caixa mensal com entradas por dia e saldo por dia | Aba Fluxo | `CashFlowPage.vue` |
| M2 | Marcar pago com data de pagamento (date picker real, não `prompt`) | Aba Fluxo | `q-date` + diálogo |
| M3 | Transferência automática de pendências do mês anterior | Aba Fluxo | `plan.js` (store) |
| M4 | Parcelamento de cartão que gera N lançamentos em meses consecutivos | Modal Novo Lançamento | `plan.js` |
| M5 | Simulador de amortização extra (avalanche) | Aba Quitação | `calc/amortization.js` |
| M6 | Visão consolidada de cartões | Aba Cartões | `CardsPage.vue` |
| M7 | Carteira de FIIs + patrimônio total | Aba Investimentos | `InvestmentsPage.vue` |
| M8 | Calculadora de renda passiva | Aba Investimentos | `calc/portfolio.js` |
| M9 | Estratégia do fundo de reserva (Tesouro Selic / CDB / conta remunerada) | Aba Investimentos | `InvestmentsPage.vue` (conteúdo estático local) |
| M10 | Metas e patrimônio | Aba Metas | `GoalsPage.vue` + `NetWorthPage.vue` |

### 5.2 Novas funcionalidades (além dos dois apps)

| # | Funcionalidade | Descrição | Sprint |
|---|---|---|---|
| **N1** | **Simulador comparativo de quitação** | Avalanche × Bola de Neve × menor taxa, com projeção de meses até zerar e economia de juros | F3 |
| **N2** | **Pagar vs. Investir** | Compara o custo de manter a dívida (juros) contra o rendimento do aporte (DY) | F3 |
| **N3** | **Cartões como entidades** | Limite total/usado, dia de fechamento, dia de vencimento, fatura do mês, % de comprometimento da renda | F3 |
| **N4** | **Parcelamento de dívida** | Parcela + taxa + nº de parcelas; gera cronograma completo; calcula custo total do empréstimo | F3 |
| **N5** | **Projeção real de N meses** | Série de 12–24 meses com cenários base/otimista/pessimista; considera carry-over, incertezas, aportes a metas | F5 |
| **N6** | **Fundo de reserva automático** | Meta calculada por nº de meses de cobertura; compara com o saldo de caixa; alerta de cobertura insuficiente | F4 |
| **N7** | **Patrimônio líquido com evolução** | Ativos − passivos, snapshot mensal, gráfico de linha da evolução | F4 |
| **N8** | **DY real e distribuição de dividendos** | DY configurável por ativo, DY médio ponderado, carteira por classe/segmento, proventos recebidos no mês | F4 |
| **N9** | **Aportes planejados em metas** | "Guardar R$ X/mês" com data de início; simula data de conclusão | F5 |
| **N10** | **Clone de mês** | Cria o mês seguinte já com fixos, entradas e parcelas recorrentes | F2 |
| **N11** | **Recorrências** | Regras "todo dia 10" que alimentam meses automaticamente | F2 |
| **N12** | **Importação CSV de extratos** | Detecção de delimitador, mapeamento de colunas, preview antes de gravar | F6 |
| **N13** | **Exportação TXT e CSV** | TXT legível (o mesmo formato do storage) + CSV para planilha | F6 |
| **N14** | **Bundle único de backup** | Um `.txt` com todos os datasets + import em um clique | F6 |
| **N15** | **Undo/Redo + histórico auditável** | Baseado no `historico.txt` (NDJSON) | F0 |
| **N16** | **Relatórios com gráficos** | 5 relatórios: fluxo mensal, categorias, dívida, carteira, patrimônio (Chart.js empacotado) | F6 |
| **N17** | **Alertas e semáforo** | Conta vencendo, déficit previsto no dia, reserva abaixo do alvo, meta em risco | F5 |
| **N18** | **Busca e filtros globais** | Filtro por texto, categoria, cartão, status, período, valor | F2 |
| **N19** | **PWA instalável e offline** | Service worker, cache do shell, manifesto, ícone, instalável em desktop/mobile | F0 |
| **N20** | **i18n pt-BR + moeda BRL + fuso SP** | Troca de locale em runtime, formatação `R$` com `pt-BR` | F7 |
| **N21** | **Proteção local por senha** | PBKDF2 via WebCrypto para abrir os dados; opcional, sem backend | F0 |
| **N22** | **Migração do Gemini v22** | Importa `fin_db_v22` / `inv_db_v22` do `localStorage` do HTML para o novo modelo e grava em `.txt` | F2 |
| **N23** | **Dívidas com taxa real (SAC/Price)** | Schedule de amortização com juros, amortization de Poisson | F3 |
| **N24** | **Metas quick-add e templates** | Modelos: reserva 6 meses, carro, viagem, laptop | F5 |

---

## 6. Arquitetura de código proposta

```
src/
├── boot/
│   ├── i18n.js
│   └── storage.js          ← NOVO: inicializa o fileStorage antes do app
├── services/
│   ├── storage/
│   │   ├── fileStorage.js  ← NOVO: facade + fila + backup + export
│   │   ├── adapters/
│   │   │   ├── fsaAdapter.js      ← NOVO
│   │   │   ├── opfsAdapter.js     ← NOVO
│   │   │   ├── downloadAdapter.js ← NOVO
│   │   │   └── memoryAdapter.js   ← NOVO
│   │   ├── datasets.js     ← NOVO: mapa dataset → arquivo + schema
│   │   ├── schemas.js      ← NOVO: validação + defaults
│   │   └── migrations.js   ← NOVO: migrações por versão de schema
│   ├── repositories/       ← NOVO: um por dataset, única porta de entrada
│   │   ├── planRepo.js  cardsRepo.js  debtsRepo.js
│   │   ├── investmentsRepo.js  goalsRepo.js  assetsRepo.js
│   │   └── profileRepo.js  settingsRepo.js
│   ├── calc/               ← NOVO: funções puras (testáveis)
│   │   ├── cashflow.js    amortization.js  projection.js
│   │   └── portfolio.js   networth.js      recurrence.js
│   ├── importers/csvImporter.js  ← NOVO
│   └── exporters/txtExporter.js  ← NOVO
├── stores/
│   ├── auth.js       ← REESCRITO: local, sem axios
│   ├── plan.js       ← NOVO: meses/entradas/itens
│   ├── cards.js  debts.js  investments.js  goals.js  assets.js  settings.js
│   └── index.js
├── pages/
│   ├── IndexPage.vue            ← REESCRITO: dashboard real
│   ├── CashFlowPage.vue         ← NOVO: fluxo de caixa (núcleo)
│   ├── DebtsPage.vue            ← NOVO: dívidas + simulador
│   ├── CardsPage.vue            ← NOVO
│   ├── InvestmentsPage.vue      ← NOVO
│   ├── NetWorthPage.vue         ← NOVO
│   ├── GoalsPage.vue            ← REESCRITO
│   ├── ReportsPage.vue          ← NOVO (rota já referenciada no menu!)
│   ├── SettingsPage.vue         ← NOVO: pasta de dados, backup, export/import, locale
│   ├── TransactionsPage.vue     ← REESCRITO (repositório local)
│   └── CategoriesPage.vue       ← REESCRITO (repositório local)
├── components/
│   ├── plan/       MonthTabs · EntradaCard · ItemRow · PaymentDialog · ItemForm
│   ├── debt/       DebtCard · SimulatorCard · DebtForm
│   ├── invest/     FiisTable · InvestForm · PassiveIncomeCard · ReserveCard
│   ├── charts/     CashflowChart · NetWorthChart · CategoriesChart
│   └── storage/    StorageStatus · ExportImportPanel · BackupPanel
└── utils/  format.js (BRL) · dates.js · uuid.js
```

**Remover:** `src/boot/axios.js`, `src/stores/transactions.js` (vira repositório local), `remote-profile/`.

---

## 6.1 Status de implementação (2026-10-22)

| Sprint | Situação | Observações |
|---|---|---|
| F0 — Fundação offline | **Concluído** | FSA + OPFS + localStorage, fila/debounce/backups, seed idempotente, PWA, Configurações |
| F1 — Núcleo local | **Concluído** | Repositórios, schemas, migrações, stores Pinia, seed Out–Dez/2026, sem `axios` |
| F2 — Fluxo de caixa | **Concluído** | Tabs, entradas, lançamentos por dia, pagamento, carry-over, parcelamento, clone, importação Gemini v22, busca/filtros e testes de cálculo |
| F3 — Dívidas/cartões | **Parcial** | CRUD + cartões + simulador (Price/SAC, avalanche/bola de neve, pagar vs. investir) + testes |
| F4 — Investimentos/patrimônio | **Parcial** | Carteira, patrimônio e snapshots; faltam DY, renda passiva e fundo de reserva |
| F5 — Metas/projeções | **Parcial** | CRUD de metas e dashboard real; faltam aportes planejados, templates, projeções e alertas |
| F6 — Relatórios/importação | **Parcial** | Bundle de backup pronto; faltam `chart.js`, relatórios e importação CSV |
| F7 — Qualidade/i18n | **Parcial** | ESLint limpo, 59 testes (cashflow, amortização, filtros, migração v22); falta i18n completo e README |

### Verificações executadas

- `npm run build` (PWA) → **Build succeeded**
- `npm test` → **59 testes passando** (`calc/cashflow`, `calc/amortization`, `calc/filters`, `migration/geminiV22`)
- ESLint → **zero erros**
- E2E (Playwright/Chrome): 66 verificações — rotas, seed, criação/edição de lançamento, pagamento, clone de mês, cartões, dívidas, simulador, patrimônio, backup/restauração, senha, importação Gemini v22 e busca/filtros — **sem erros de console**

### Correções recentes

- `boot/storage.js` agora chama `seedMissing()` para materializar os `.txt` no primeiro boot.
- `store/plan.js` preserva o mês selecionado ao recarregar dados.
- Páginas públicas (`/login`, `/register`, `/forgot-password`) ganharam `PublicLayout` (corrige `QPage needs to be a deep child of QLayout`).
- `SettingsPage` ganhou seção de perfil/senha; reset e importação recarregam o app.
- Importação Gemini v22 (`services/migration`): lê `fin_db_v22`, `inv_db_v22` e flags `v22_*`, converte pagamentos (inclusive pendências herdadas), vincula cartões por prefixo e grava nos `.txt` com opção de substituir ou mesclar.
- Busca e filtros globais (`calc/filters` + `FiltroLancamentos.vue`): texto sem acentos, categoria, cartão, status e faixa de valor no fluxo de caixa e em transações, com contador de resultados e limpeza rápida.

---

## 7. Roadmap

> Estimativa em **dias de trabalho (dw)** para 1 desenvolvedor. Ajustar conforme a disponibilidade.

### Sprint 0 — Fundação offline (F0) — ~6 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 0.1 | `fileStorage.js` + 4 adaptadores | `init()` detecta o modo e retorna `{mode, writable}` |
| 0.2 | Seletor de pasta (FSA) com handle persistido em IndexedDB | Recarregar a página reabre o handle sem novo picker (Chrome) |
| 0.3 | OPFS com criação automática da estrutura de datasets | Firefox/Safari persistem entre reloads |
| 0.4 | Fila de escrita, debounce, backup `.bak`, rotação | Nenhum arquivo fica truncado após escrita interrompida |
| 0.5 | Export/import de bundle `.txt` | Export → limpar → Import restaura 100% do estado |
| 0.6 | Modo PWA (`quasar build -m pwa`), manifest, service worker | App instala e abre **sem rede** |
| 0.7 | Página de Configurações: status do storage + ações | Usuário vê o modo, a pasta e os arquivos |
| 0.8 | `boot/storage.js` inicializa antes do app | Splash de "preparando armazenamento" |

### Sprint 1 — Núcleo de dados local (F1) — ~5 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 1.1 | `auth.js` local: perfil, sessão, senha opcional (PBKDF2) | Login local funciona offline; sem token JWT |
| 1.2 | Repositórios + `datasets.js` + `schemas.js` + `migrations.js` | `planRepo.save()` grava `fluxo-caixa.txt` |
| 1.3 | Pinia stores reativos sobre os repositórios | UI reage ao `save()` sem `localStorage` |
| 1.4 | Seed dos dados do Gemini (Outubro–Dezembro 2026 + 5 FIIs) | Primeiro boot populado e gravado em `.txt` |
| 1.5 | Remover `axios` do bundle e do `quasar.config.js` | `grep axios src/` vazio; bundle menor |
| 1.6 | Moeda BRL + fuso America/Sao_Paulo em todo o formatação | `R$ 1.234,56` em todas as telas |

### Sprint 2 — Fluxo de caixa (F2) — ~8 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 2.1 | `CashFlowPage.vue`: tabs de mês + entradas (10/15/30) editáveis | Editar entrada reflete no saldo do dia |
| 2.2 | Lançamentos agrupados por vencimento com subtotais | Tabela por dia 1/10/15/30 |
| 2.3 | Diálogo "marcar pago" com data | Data gravada no `.txt` e exibida |
| 2.4 | Carry-over de pendências | Pendência de Out aparece em Nov com selo "Pendente" |
| 2.5 | Saldo por dia: Sobra/Déficit + semáforo | Mês com déficit sinalizado em vermelho |
| 2.6 | Modal Novo Lançamento com parcelamento (N meses) | Parcelar R$ 1.200 em 3x gera Out/Nov/Dez |
| 2.7 | Recorrências + "Clonar mês anterior" | Mês novo nasce com fixos e parcelas |
| 2.8 | Importação do Gemini v22 (`fin_db_v22`) | Import converte e grava no novo formato |
| 2.9 | Busca/filtros globais | Filtrar por texto/categoria/status |
| 2.10 | `plan.js` + `calc/cashflow.js` com testes unitários | Cobertura de saldo, déficit e carry-over |

### Sprint 3 — Dívidas, simulador e cartões (F3) — ~7 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 3.1 | CRUD de dívidas (saldo, taxa, parcela, nº de parcelas) | Agenda de amortização gerada |
| 3.2 | `calc/amortization.js`: avalanche × bola de neve × menor taxa | Tabela comparativa com meses até zerar |
| 3.3 | N1 — comparador de estratégias + economia de juros | Jogada extra de R$ 1.000 comparada nas 3 estratégias |
| 3.4 | N2 — Pagar vs. Investir | Compara juros da dívida × DY da carteira |
| 3.5 | CRUD de cartões (limite, fechamento, vencimento) | Fatura do mês calculada pela data de compra |
| 3.6 | `CardsPage.vue`: consolidado + % de comprometimento da renda | Alerta se uso > 30% da renda |
| 3.7 | Migração: `cartaoId` real nos lançamentos | Nenhum lançamento depende de regex no texto |
| 3.8 | Testes unitários de amortização (SAC, Price, extra) | Casos de borda cobertos |

### Sprint 4 — Investimentos, reserva e patrimônio (F4) — ~6 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 4.1 | `InvestmentsPage.vue`: carteira com preço médio, atual, mercado, DY | Total de patrimônio calculado |
| 4.2 | N8 — DY real por ativo + DY médio ponderado | DY muda ao atualizar preços |
| 4.3 | Calculadora de renda passiva (M8) com DY configurável | Meta de R$ 2.000/mês → capital necessário |
| 4.4 | N6 — fundo de reserva: meses de cobertura + alerta | "3,2 meses de cobertura" vs meta de 6 |
| 4.5 | `NetWorthPage.vue`: ativos − passivos + snapshot | Gráfico de evolução mensal |
| 4.6 | Proventos/dividendos recebidos no mês | Feeding automático do fluxo de caixa |
| 4.7 | Estratégia de reserva estática (M9) com conteúdo local | Sem CDN, sem requisição externa |

### Sprint 5 — Metas, projeções e alertas (F5) — ~6 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 5.1 | `GoalsPage.vue` sobre repositório local + `GoalCard` em BRL | CRUD funcional offline |
| 5.2 | N9 — aportes planejados + simulação de conclusão | "R$ 500/mês → conclui em 18 meses" |
| 5.3 | N24 — templates de meta (reserva 6m, carro, viagem) | Criar meta a partir de template |
| 5.4 | N5 — motor de projeção real (12–24 meses, 3 cenários) | Série numérica; hoje é texto hardcoded |
| 5.5 | N17 — alertas: vencimento, déficit do dia, reserva, meta | Central de alertas na dashboard |
| 5.6 | Dashboard unificada com widgets reais | Totais vêm dos repositórios, sem barras fake |

### Sprint 6 — Relatórios, importação/exportação (F6) — ~6 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 6.1 | Instalar `chart.js` (npm) + 4 wrappers | Gráficos renderizam sem rede |
| 6.2 | Relatórios: fluxo, categorias, dívida, carteira, patrimônio | 5 relatórios com filtros de período |
| 6.3 | N12 — importador CSV com auto-detecção e preview | CSV de extrato vira lançamentos |
| 6.4 | N13 — exportação TXT e CSV | `.txt` no mesmo formato do storage |
| 6.5 | N14 — bundle único de backup | 1 arquivo com todos os datasets |
| 6.6 | `ReportsPage.vue` (rota já existente no menu) | Menu sem links quebrados |

### Sprint 7 — Qualidade, i18n e entrega (F7) — ~6 dw

| # | Tarefa | Critério de aceite |
|---|---|---|
| 7.1 | N20 — i18n pt-BR completo + en-US + seletor de idioma | Troca de idioma em runtime |
| 7.2 | Extrair todas as strings hardcoded das páginas | `grep` por literais de UI → 0 |
| 7.3 | Testes: `calc/*` + repositories + storage (vitest) | Cobertura ≥ 80% na camada de cálculo |
| 7.4 | ESLint + Prettier sem erros | `npm run lint` limpo |
| 7.5 | Limpeza do repo: remover `remote-profile/`, atualizar `.gitignore` | Repo enxuto |
| 7.6 | Documentação: README + guia de backup | Usuário sabe onde ficam os dados |
| 7.7 | Build de produção PWA validado em 3 navegadores | Abre offline após 1º carregamento |

**Total estimado: ~50 dias de trabalho.**

---

## 8. Detalhamento dos cálculos críticos (fonte de bugs)

Todos os cálculos ficam em `src/services/calc/` como **funções puras**, sem Vue/Pinia — é o que garante testabilidade e evita divergência entre telas.

```js
// cashflow.js
export function saldoDoDia(mes, dia, pagamentos)        // entrada − soma devida no dia
export function totalPendente(mes)                       // soma dos itens não pagos
export function pendenciasAnteriores(meses, mesAtual)   // carry-over
export function totalEntradas(mes)                       // soma das entradas

// amortization.js
export function simularAmortizacao(dividas, extra, estrategia)
//   estrategia: 'avalanche' | 'bolaDeNeve' | 'menorTaxa'
export function scheduleParcelas(divida, metodo)         // 'sac' | 'price'
export function custoTotal(divida)                       // juros totais

// projection.js
export function projetarFluxo(meses, { meses, cenario, taxaCrescimento })
export function mesDeQuitacao(dividas, aporteMensal)

// portfolio.js
export function dyMedioPonderado(investimentos)
export function capitalParaRendaPassiva(metaMensal, dyMensal)
export function coberturaReserva(caixa, despesaMensal)

// networth.js
export function patrimonioLiquido(ativos, passivos)
export function evolucaoPatrimonio(snapshots)
```

**Regras de arredondamento:** todo valor monetário é armazenado em **centavos (inteiro)** ou normalizado com `Math.round(v * 100) / 100`; a divisão de parcelas usa o **método do resto** (última parcela absorve a diferença) para evitar `0,01` fantasma — bug clássico ao parcelar R$ 100,00 em 3x.

---

## 9. Riscos e mitigações

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | FSA indisponível no Safari/Firefox | Alta | Médio | OPFS como fallback automático (cobertura real de ~97%) |
| R2 | Permissão do handle perdida após restart do browser | Média | Alto | `queryPermission` + re-prompt no 1º clique; OPFS não depende disso |
| R3 | Corrupção de arquivo em queda de energia | Baixa | **Crítico** | Backup `.bak` + snapshot diário + escrita atômica via `createWritable()` |
| R4 | Perda de dados ao limpar dados do navegador (OPFS) | Média | **Crítico** | Export automático mensal + botão "Baixar backup" sempre visível + aviso explícito na tela de Configurações |
| R5 | Esquema de dados evolui e arquivos antigos quebram | Alta | Alto | `schema` no header + `migrations.js` em cascata + teste de migração por versão |
| R6 | Bundle cresce com charts + libs | Média | Baixo | Import dinâmico de `chart.js` por rota; `quasar build` com code-splitting |
| R7 | Regressão de cálculo financeiro silenciosa | Média | **Crítico** | Funções puras + vitest com casos GOLD; cada fórmula tem teste com valor esperado fixo |
| R8 | Parcelamento gera diferença de centavos | Alta | Médio | Método do resto + teste unitário |
| R9 | Migração do Gemini perde dados por mudança de formato | Média | Alto | Conversor com relatório de itens não convertidos + backup do original |
| R10 | `localStorage` ainda usado por libs do Quasar | Baixa | Baixo | Auditoria no F7 |

---

## 10. Critérios de aceite globais (Definition of Done)

> Status em 2026-10-22, verificado com build de produção, ESLint, 31 testes unitários e testes E2E (Playwright).

- [x] `npm run build` (modo PWA) gera artefato válido (`dist/pwa`).
- [ ] Validar abertura **sem rede** (DevTools → Network → Offline) após o 1º carregamento.
- [x] Todo dado criado na UI aparece em um arquivo `.txt` no disco, em formato legível.
- [x] Fechar e reabrir o app restaura **100%** do estado (entradas, lançamentos, status de pagamento + data, cartões, dívidas, investimentos, metas, patrimônio).
- [x] Importar um `.txt` de backup reproduz o estado exatamente (teste: criar → exportar → apagar → importar).
- [x] Nenhuma requisição HTTP em runtime (`grep -r "https\?://" src/` sem URLs externas).
- [x] Zero erros de ESLint; suíte de testes verde (`npm test` → 31 testes).
- [x] Nenhum link de menu apontando para rota inexistente (`/reports` e `/budgets` resolvidos).
- [x] Valores em `R$` com formatação `pt-BR`; datas em `America/Sao_Paulo`.
- [ ] Documentação explicando onde os dados ficam e como fazer backup (parcial: tela de Configurações).

---

## 11. Ordem de execução sugerida

1. **F0 + F1** — sem isso nada mais funciona offline (prioridade máxima).
2. **F2** — o fluxo de caixa é o coração do app e a maior lacuna frente ao Gemini.
3. **F3 + F4** — dívidas, cartões, investimentos, patrimônio (correspondem a 4 abas do Gemini).
4. **F5 + F6** — metas, projeções, relatórios, gráficos.
5. **F7** — i18n, testes, limpeza, entrega.

**Atalho possível:** se o objetivo imediato for "rodar o Gemini v22 dentro do Quasar o quanto antes", o caminho mínimo é **F0 → F1 → F2.1–F2.6** (~19 dw), já entregando fluxo de caixa, parcelas, carry-over e persistência em TXT. O restante evolui a partir desse núcleo.

---

## Apêndice A — Inventário de telas

| Rota | Página | Status |
|---|---|---|
| `/` | Dashboard | Reescrever com dados reais |
| `/fluxo-caixa` | Fluxo de Caixa | **Nova** (núcleo) |
| `/dividas` | Dívidas & Simulador | **Nova** |
| `/cartoes` | Cartões | **Nova** |
| `/investimentos` | Investimentos & Reserva | **Nova** |
| `/patrimonio` | Patrimônio Líquido | **Nova** |
| `/transactions` | Transações | Reescrever (local) |
| `/categories` | Categorias | Reescrever (local) |
| `/goals` | Metas | Reescrever (local) |
| `/reports` | Relatórios | **Nova** (link já no menu) |
| `/budgets` | Orçamento | **Nova** (link já no menu) — escopo: orçamento mensal por categoria vs. realizado |
| `/settings` | Configurações & Dados | **Nova** |
| `/login` `/register` `/forgot-password` | Auth local | Reescrever (sem API) |

## Apêndice B — Dependências a adicionar

| Pacote | Versão | Motivo |
|---|---|---|
| `chart.js` | ^4.4 | Gráficos offline (substitui o CDN do Gemini) |
| `vitest` | ^2.x | Testes da camada de cálculo e repositórios |
| `@vue/test-utils` | ^2.4 | Testes de componentes críticos (opcional) |

**Remover:** `axios` (depois da migração).

> **Nota sobre Tailwind/FontAwesome:** o HTML do Gemini usa ambos via CDN. No Quasar **não** vamos adicioná-los: os componentes do Quasar (QCard, QTable, QDialog, QStepper, QDate) cobrem o mesmo papel com menos bytes, e o Material Icons já está configurado em `quasar.config.js` → `extras`. Isso garante o requisito de offline sem camada extra de CSS.
