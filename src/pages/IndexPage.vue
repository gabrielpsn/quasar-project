<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Painel</div>
        <div class="text-caption text-grey-8">{{ mesRotulo }} · 100% offline, dados em arquivos .txt</div>
      </div>
      <q-btn color="primary" icon="calendar_month" label="Fluxo de caixa" to="/fluxo-caixa" />
    </div>

    <div class="row q-col-gutter-md">
      <!-- Saldo devedor -->
      <div class="col-12 col-md-4">
        <q-card class="bg-primary text-white">
          <q-card-section>
            <div class="text-subtitle2">Saldo devedor do mês</div>
            <div class="text-h4">{{ brl(resumo?.saldoDevedor) }}</div>
            <div class="text-caption q-mt-sm">
              {{ resumo?.pago ? `${brl(resumo.pago)} já pago` : 'Nada pago ainda' }}
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-actions align="around">
            <q-btn flat icon="add" label="Nova entrada" to="/fluxo-caixa" />
            <q-btn flat icon="remove" label="Novo gasto" to="/fluxo-caixa" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Renda -->
      <div class="col-12 col-md-4">
        <q-card class="bg-positive text-white">
          <q-card-section>
            <div class="text-subtitle2">Renda do mês</div>
            <div class="text-h4">{{ brl(resumo?.renda) }}</div>
            <q-linear-progress
              :value="rendaProgress"
              stripe
              rounded
              class="q-mt-sm"
              color="white"
              track-color="transparent"
            />
            <div class="text-caption q-mt-sm">
              Previsto para gastar: {{ brl(resumo?.totalItens) }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Sobra -->
      <div class="col-12 col-md-4">
        <q-card :class="(resumo?.sobra ?? 0) >= 0 ? 'bg-teal text-white' : 'bg-negative text-white'">
          <q-card-section>
            <div class="text-subtitle2">Sobra estimada</div>
            <div class="text-h4">{{ brl(resumo?.sobra) }}</div>
            <div class="text-caption q-mt-sm">
              Pendente: {{ brl(resumo?.pendente) }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Lançamentos recentes -->
      <div class="col-12">
        <q-card flat bordered class="rounded-borders">
          <q-card-section class="row items-center">
            <div class="text-subtitle1 text-weight-medium">Lançamentos recentes</div>
            <q-space />
            <q-btn flat round dense icon="refresh" :loading="loading" @click="loadData">
              <q-tooltip>Atualizar</q-tooltip>
            </q-btn>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="loading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
            <div class="text-caption q-mt-sm">Carregando…</div>
          </q-card-section>

          <q-card-section v-else-if="!recent.length" class="text-center text-grey q-pa-xl">
            <q-icon name="receipt_long" size="3em" />
            <div class="text-h6 q-mt-sm">Nenhum lançamento ainda</div>
            <q-btn color="primary" label="Ir para o fluxo de caixa" class="q-mt-md" to="/fluxo-caixa" />
          </q-card-section>

          <q-list v-else separator>
            <q-item v-for="item in recent" :key="item.id" class="q-py-md">
              <q-item-section avatar>
                <q-avatar
                  :color="item.type === 'income' ? 'positive' : 'negative'"
                  text-color="white"
                  :icon="item.type === 'income' ? 'south_east' : 'north_east'"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ item.desc }}</q-item-label>
                <q-item-label caption lines="1">
                  {{ dataBR(item.date) }} · {{ item.category }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-item-label :class="item.type === 'income' ? 'text-positive' : 'text-negative'">
                  {{ item.type === 'income' ? '+' : '-' }}{{ brl(item.amount) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-card-actions align="right" v-if="recent.length">
            <q-btn flat color="primary" label="Ver tudo" to="/fluxo-caixa" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Metas -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Progresso das metas</div>
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!goals.length" class="text-center text-grey q-pa-xl">
            <q-icon name="flag" size="3em" />
            <div class="text-h6 q-mt-sm">Nenhuma meta ainda</div>
            <q-btn color="primary" label="Criar meta" class="q-mt-md" to="/goals" />
          </q-card-section>
          <q-card-section v-else>
            <div v-for="goal in goals" :key="goal.id" class="q-mb-md">
              <div class="row items-center">
                <div class="col-12 col-md-4">
                  <div class="text-weight-medium">{{ goal.name }}</div>
                  <div class="text-caption text-grey-8">
                    {{ brl(goal.current_amount) }} de {{ brl(goal.target_amount) }}
                  </div>
                </div>
                <div class="col-12 col-md-8">
                  <q-linear-progress
                    :value="goalProgress(goal)"
                    stripe
                    rounded
                    :color="progressColor(goal)"
                    class="q-mt-sm"
                  >
                    <div class="absolute-full flex flex-center">
                      <q-badge color="white" :label="`${Math.round(goalProgress(goal) * 100)}%`" />
                    </div>
                  </q-linear-progress>
                </div>
              </div>
            </div>
            <div class="text-right q-mt-md">
              <q-btn flat color="primary" label="Ver todas" to="/goals" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Gastos por categoria -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Gastos por categoria</div>
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!gastosPorCategoria.length" class="text-center text-grey q-pa-xl">
            <q-icon name="category" size="3em" />
            <div class="text-h6 q-mt-sm">Sem dados de gastos</div>
          </q-card-section>
          <q-card-section v-else>
            <div v-for="categoria in gastosPorCategoria" :key="categoria.categoria" class="q-mb-sm">
              <div class="row items-center">
                <div class="col-4 row items-center">
                  <q-avatar :color="corCategoria(categoria.categoria)" text-color="white" size="sm" class="q-mr-sm">
                    <q-icon name="label" />
                  </q-avatar>
                  <span class="text-body2">{{ categoria.categoria }}</span>
                </div>
                <div class="col-5">
                  <q-linear-progress
                    :value="percentualCategoria(categoria)"
                    :color="corCategoria(categoria.categoria)"
                    class="q-mx-sm"
                    rounded
                  />
                </div>
                <div class="col-3 text-right text-body2">{{ brl(categoria.total) }}</div>
              </div>
            </div>
            <div class="text-right q-mt-md">
              <q-btn flat color="primary" label="Ver categorias" to="/categories" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Fundo de reserva -->
      <div class="col-12">
        <q-card flat bordered class="rounded-borders">
          <q-card-section class="row items-center">
            <div class="text-subtitle1 text-weight-medium">
              <q-icon name="savings" class="q-mr-sm" />
              Fundo de reserva
            </div>
            <q-space />
            <q-btn flat color="primary" label="Ajustar" to="/settings" />
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-4">
                <div class="text-h5">{{ brl(reserva.valorAtual) }}</div>
                <div class="text-caption text-grey-8">
                  Meta: {{ brl(metaReserva) }} · {{ reserva.mesesCobertura }} meses de despesas
                </div>
                <div class="text-caption text-grey-7">
                  Aporte: {{ brl(reserva.aporteMensal) }}/mês
                </div>
              </div>
              <div class="col-12 col-md-8">
                <q-linear-progress
                  :value="progressoReserva"
                  :color="cobertura < 3 ? 'warning' : 'positive'"
                  height="12px"
                  rounded
                />
                <div class="row justify-between text-caption text-grey-8 q-mt-xs">
                  <span>
                    {{ numero(cobertura, 1) }} meses de cobertura
                    <span v-if="despesaMedia"> · despesa média {{ brl(despesaMedia) }}/mês</span>
                  </span>
                  <span>{{ percentual(progressoReserva) }} da meta</span>
                </div>
              </div>
            </div>
            <q-banner
              v-if="despesaMedia && cobertura < 3"
              dense
              rounded
              class="q-mt-md bg-orange-1 text-orange-10"
            >
              <q-icon name="warning" class="q-mr-sm" />
              Reserva abaixo de 3 meses de despesas. Priorize reforçar o fundo de emergência.
            </q-banner>
            <q-banner
              v-else-if="despesaMedia"
              dense
              rounded
              class="q-mt-md bg-green-1 text-green-10"
            >
              <q-icon name="check_circle" class="q-mr-sm" />
              Reserva saudável para imprevistos.
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePlanStore } from 'src/stores/plan'
import { useGoalStore } from 'src/stores/goals'
import { useTransactionStore } from 'src/stores/transactions'
import { useSettingsStore } from 'src/stores/settings'
import { brl, dataBR, numero, percentual } from 'src/utils/format'
import { monthLabel } from 'src/utils/dates'
import { totaisPorCategoria } from 'src/services/calc/cashflow'

const plan = usePlanStore()
const goalsStore = useGoalStore()
const transactionStore = useTransactionStore()
const settingsStore = useSettingsStore()

const loading = ref(true)
const recent = ref([])

const mes = computed(() => plan.mesAtual)
const resumo = computed(() => plan.resumoAtual)
const mesRotulo = computed(() => mes.value?.rotulo || monthLabel(plan.mesAtualId || ''))

const goals = computed(() => goalsStore.goals.slice(0, 4))
const gastosPorCategoria = computed(() => totaisPorCategoria(mes.value, 'saida'))

const reserva = computed(() => settingsStore.reserva)

const despesaMedia = computed(() => {
  const despesas = plan.meses
    .map((m) => (m.itens || []).reduce((acc, item) => acc + (Number(item.valor) || 0), 0))
    .filter((total) => total > 0)
  const ultimas = despesas.slice(-3)
  if (!ultimas.length) return 0
  return ultimas.reduce((acc, total) => acc + total, 0) / ultimas.length
})

const cobertura = computed(() => {
  if (!despesaMedia.value) return 0
  return (Number(reserva.value.valorAtual) || 0) / despesaMedia.value
})

const metaReserva = computed(() =>
  Math.round(despesaMedia.value * (Number(reserva.value.mesesCobertura) || 6) * 100) / 100
)

const progressoReserva = computed(() => {
  if (!metaReserva.value) return 0
  return Math.min(1, (Number(reserva.value.valorAtual) || 0) / metaReserva.value)
})

const rendaProgress = computed(() => {
  const renda = Number(resumo.value?.renda) || 0
  const itens = Number(resumo.value?.totalItens) || 0
  if (!renda) return 0
  return Math.min(1, itens / renda)
})

function goalProgress(goal) {
  if (!goal.target_amount) return 0
  return Math.min(1, (goal.current_amount || 0) / goal.target_amount)
}

function progressColor(goal) {
  const p = goalProgress(goal)
  if (p >= 1) return 'positive'
  if (p >= 0.7) return 'warning'
  return 'primary'
}

function corCategoria(categoria) {
  const mapa = {
    Fixo: 'blue',
    Variável: 'teal',
    Cartão: 'indigo',
    Empréstimo: 'amber',
  }
  return mapa[categoria] || 'grey-7'
}

function percentualCategoria(categoria) {
  const total = gastosPorCategoria.value.reduce((acc, c) => acc + c.total, 0)
  if (!total) return 0
  return categoria.total / total
}

async function loadData() {
  loading.value = true
  try {
    await Promise.all([plan.init(), goalsStore.init(), transactionStore.init(), settingsStore.init()])
    recent.value = transactionStore.recentTransactions.slice(0, 6)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
