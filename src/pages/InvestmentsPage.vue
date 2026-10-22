<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Investimentos</div>
        <div class="text-caption text-grey-8">
          Aplicado {{ brl(investments.totalInvestido) }} · atual {{ brl(investments.valorAtualTotal) }}
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          outline
          color="primary"
          icon="savings"
          label="Renda passiva"
          :disable="!investments.investments.length"
          @click="dialogRenda = true"
        />
        <q-btn color="primary" icon="add" label="Novo investimento" @click="novoInvestimento" />
      </div>
    </div>

    <div v-if="investments.investments.length" class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">Valor atual</div>
            <div class="text-h6">{{ brl(investments.valorAtualTotal) }}</div>
            <div class="text-caption" :class="investments.resultadoTotal >= 0 ? 'text-positive' : 'text-negative'">
              {{ investments.resultadoTotal >= 0 ? '+' : '' }}{{ brl(investments.resultadoTotal) }}
              ({{ percentual(rentabilidade) }})
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">DY médio ponderado</div>
            <div class="text-h6">{{ numero(dyMedioPonderado, 2) }}% a.a.</div>
            <div class="text-caption text-grey-7">pelos valores atuais da carteira</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">Renda passiva estimada</div>
            <div class="text-h6 text-positive">{{ brl(rendaMensal) }}/mês</div>
            <div class="text-caption text-grey-7">{{ brl(rendaAnual) }} por ano</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">Aplicado</div>
            <div class="text-h6">{{ brl(investments.totalInvestido) }}</div>
            <div class="text-caption text-grey-7">{{ investments.investments.length }} ativo(s)</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div v-if="investments.loading" class="q-pa-lg"><q-inner-loading showing color="primary" /></div>

    <div v-else-if="!investments.investments.length" class="q-pa-lg text-center">
      <q-icon name="pie_chart" size="4rem" color="grey-4" />
      <div class="text-h6 text-grey-7 q-mt-sm">Nenhum investimento registrado</div>
      <div class="text-caption text-grey-6 q-mb-md">Cadastre seus investimentos para acompanhar a rentabilidade.</div>
      <q-btn color="primary" icon="add" label="Novo investimento" @click="novoInvestimento" />
    </div>

    <q-table
      v-else
      flat
      bordered
      row-key="id"
      :rows="investments.investments"
      :columns="columns"
      :pagination="rowsPerPage"
      class="rounded-borders"
    >
      <template #body-cell-resultado="props">
        <q-td :props="props" :class="resultado(props.row) >= 0 ? 'text-positive' : 'text-negative'">
          {{ brl(resultado(props.row)) }}
        </q-td>
      </template>
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn dense flat size="sm" icon="edit" color="grey-7" @click="editarInvestimento(props.row)">
            <q-tooltip>Editar</q-tooltip>
          </q-btn>
          <q-btn dense flat size="sm" icon="delete" color="grey-7" @click="removerInvestimento(props.row)">
            <q-tooltip>Excluir</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 360px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editando ? 'Editar investimento' : 'Novo investimento' }}</div>
          <q-space />
          <q-btn v-close-popup dense flat icon="close" round />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.nome" label="Nome" outlined dense />
          <q-input v-model="form.ticker" label="Ticker / código" outlined dense />
          <q-select v-model="form.tipo" :options="tipos" label="Tipo" outlined dense />
          <q-input v-model.number="form.valorAplicado" label="Valor aplicado (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <q-input v-model.number="form.valorAtual" label="Valor atual (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <q-input v-model.number="form.dy" label="Dividendos (DY % a.a.)" type="number" step="0.01" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-gutter-sm">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn color="primary" :label="editando ? 'Salvar' : 'Adicionar'" :disable="!form.nome" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogRenda">
      <q-card style="min-width: 360px; max-width: 460px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            <q-icon name="savings" class="q-mr-sm" />
            Calculadora de renda passiva
          </div>
          <q-space />
          <q-btn v-close-popup dense flat icon="close" round />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model.number="rendaDesejada"
            label="Renda desejada por mês (R$)"
            type="number"
            step="100"
            min="0"
            outlined
            dense
          >
            <template #prepend>R$</template>
          </q-input>
          <q-input
            v-model.number="dyAlvo"
            label="DY considerado (% a.a.)"
            type="number"
            step="0.1"
            min="0"
            outlined
            dense
          />
          <q-separator />
          <div class="row justify-between">
            <span class="text-grey-8">Capital necessário</span>
            <strong class="text-h6 text-primary">{{ brl(capitalNecessario) }}</strong>
          </div>
          <div class="row justify-between">
            <span class="text-grey-8">Sua carteira hoje</span>
            <strong>{{ brl(investments.valorAtualTotal) }}</strong>
          </div>
          <div class="row justify-between">
            <span class="text-grey-8">Falta investir</span>
            <strong :class="faltaParaMeta > 0 ? 'text-orange-9' : 'text-positive'">
              {{ brl(Math.max(0, faltaParaMeta)) }}
            </strong>
          </div>
          <div class="row justify-between">
            <span class="text-grey-8">Sua carteira gera</span>
            <strong class="text-positive">{{ brl(rendaMensal) }}/mês</strong>
          </div>
          <div v-if="dyMedioPonderado > 0" class="text-caption text-grey-7">
            DY médio atual da carteira: {{ numero(dyMedioPonderado, 2) }}% a.a.
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              label="usar"
              @click="dyAlvo = numeroParaInput(dyMedioPonderado)"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn v-close-popup flat label="Fechar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useInvestmentStore } from 'src/stores/investments'
import { brl, cents, numero, percentual } from 'src/utils/format'

const $q = useQuasar()
const investments = useInvestmentStore()

const dialog = ref(false)
const dialogRenda = ref(false)
const editando = ref(null)
const rowsPerPage = { rowsPerPage: 0 }

const rendaDesejada = ref(2000)
const dyAlvo = ref(8)

const tipos = ['Renda Fixa', 'Renda Variável', 'FII', 'ETF', 'Cripto', 'Previdência']

const form = ref({
  nome: '',
  ticker: '',
  tipo: 'Renda Fixa',
  valorAplicado: 0,
  valorAtual: 0,
  dy: 0,
})

const columns = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'ticker', label: 'Ticker', field: 'ticker', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'valorAplicado', label: 'Aplicado', field: 'valorAplicado', align: 'right', format: (v) => brl(v) },
  { name: 'valorAtual', label: 'Atual', field: 'valorAtual', align: 'right', format: (v) => brl(v) },
  { name: 'dy', label: 'DY', field: 'dy', align: 'right', format: (v) => `${numero(v, 2)}%` },
  { name: 'rendaMensal', label: 'Renda/mês', field: 'rendaMensal', align: 'right', format: (_v, row) => brl(rendaDoAtivo(row)) },
  { name: 'resultado', label: 'Resultado', field: 'resultado', align: 'right' },
  { name: 'acoes', label: '', field: 'acoes', align: 'right' },
]

function resultado(row) {
  return cents((Number(row.valorAtual) || 0) - (Number(row.valorAplicado) || 0))
}

function rendaDoAtivo(row) {
  return cents(((Number(row.valorAtual) || 0) * (Number(row.dy) || 0)) / 100 / 12)
}

const rentabilidade = computed(() =>
  investments.totalInvestido > 0 ? investments.resultadoTotal / investments.totalInvestido : 0
)

const dyMedioPonderado = computed(() => {
  const total = investments.valorAtualTotal
  if (!total) return 0
  return (
    investments.investments.reduce(
      (acc, i) => acc + (Number(i.valorAtual) || 0) * (Number(i.dy) || 0),
      0
    ) / total
  )
})

const rendaMensal = computed(() =>
  cents(
    investments.investments.reduce(
      (acc, i) => acc + ((Number(i.valorAtual) || 0) * (Number(i.dy) || 0)) / 100 / 12,
      0
    )
  )
)

const rendaAnual = computed(() => cents(rendaMensal.value * 12))

const capitalNecessario = computed(() =>
  Number(dyAlvo.value) > 0 ? cents((Number(rendaDesejada.value) * 12) / (Number(dyAlvo.value) / 100)) : 0
)

const faltaParaMeta = computed(() => cents(capitalNecessario.value - investments.valorAtualTotal))

function numeroParaInput(valor) {
  return Math.round(Number(valor) * 100) / 100
}

function novoInvestimento() {
  editando.value = null
  form.value = { nome: '', ticker: '', tipo: 'Renda Fixa', valorAplicado: 0, valorAtual: 0, dy: 0 }
  dialog.value = true
}

function editarInvestimento(item) {
  editando.value = item
  form.value = { ...item }
  dialog.value = true
}

async function salvar() {
  if (editando.value) {
    await investments.updateInvestment({ id: editando.value.id, ...form.value })
  } else {
    await investments.createInvestment(form.value)
  }
  dialog.value = false
  $q.notify({ color: 'positive', icon: 'check_circle', message: 'Investimento salvo.' })
}

async function removerInvestimento(item) {
  await investments.removeInvestment(item.id)
  $q.notify({ color: 'positive', icon: 'delete', message: 'Investimento removido.' })
}

onMounted(() => investments.init())
</script>
