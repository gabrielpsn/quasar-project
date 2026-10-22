<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Fluxo de Caixa</div>
        <div class="text-caption text-grey-8">
          {{ mes?.rotulo || 'Sem mês selecionado' }} · dados salvos em fluxo-caixa.txt
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          outline
          color="primary"
          icon="content_copy"
          label="Clonar"
          :disable="!mes"
          @click="clonarMes"
        />
        <q-btn
          color="primary"
          icon="add"
          label="Novo lançamento"
          @click="novoLancamento"
        />
      </div>
    </div>

    <!-- Seletor de mês -->
    <q-tabs
      v-if="plan.mesesOrdenados.length"
      :model-value="plan.mesAtualId"
      class="text-grey-8"
      active-color="primary"
      indicator-color="primary"
      align="left"
      dense
      no-caps
      @update:model-value="plan.setMesAtual"
    >
      <q-tab
        v-for="m in plan.mesesOrdenados"
        :key="m.id"
        :name="m.id"
        :label="m.rotulo"
      />
    </q-tabs>
    <q-separator v-if="plan.mesesOrdenados.length" class="q-mb-md" />

    <div v-if="plan.loading" class="q-pa-lg">
      <q-inner-loading showing color="primary" />
    </div>

    <template v-else>
      <!-- Resumo -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="rounded-borders">
            <q-card-section>
              <div class="text-caption text-grey-8">Renda do mês</div>
              <div class="text-h6 text-positive">{{ brl(resumo?.renda) }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="rounded-borders">
            <q-card-section>
              <div class="text-caption text-grey-8">Saldo devedor</div>
              <div class="text-h6" :class="resumo?.saldoDevedor > 0 ? 'text-negative' : 'text-primary'">
                {{ brl(resumo?.saldoDevedor) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="rounded-borders">
            <q-card-section>
              <div class="text-caption text-grey-8">Já pago</div>
              <div class="text-h6 text-primary">{{ brl(resumo?.pago) }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="rounded-borders">
            <q-card-section>
              <div class="text-caption text-grey-8">Sobra estimada</div>
              <div class="text-h6" :class="resumo?.sobra >= 0 ? 'text-positive' : 'text-negative'">
                {{ brl(resumo?.sobra) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Entradas -->
      <q-card flat bordered class="rounded-borders q-mb-md">
        <q-card-section class="row items-center">
          <div class="text-subtitle1 text-weight-medium">Entradas</div>
          <q-space />
          <q-btn
            dense
            flat
            color="primary"
            icon="add"
            label="Adicionar entrada"
            @click="novaEntrada"
          />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="!mes?.entradas?.length" class="text-caption text-grey-6">
            Nenhuma entrada cadastrada neste mês.
          </div>
          <div v-else class="row q-col-gutter-sm">
            <div v-for="entrada in mes.entradas" :key="entrada.id" class="col-12 col-sm-6 col-md-4">
              <div class="row items-center no-wrap">
                <q-icon name="payments" color="positive" size="20px" class="q-mr-sm" />
                <div class="col">
                  <div class="text-body2 text-weight-medium">{{ entrada.desc }}</div>
                  <div class="text-caption text-grey-8">Dia {{ entrada.dia }}</div>
                </div>
                <div class="col text-right">
                  <div class="text-body2 text-positive">{{ brl(entrada.valor) }}</div>
                  <q-btn
                    dense
                    flat
                    size="sm"
                    icon="delete"
                    color="grey-6"
                    @click="removerEntrada(entrada)"
                  >
                    <q-tooltip>Remover</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Pendências de meses anteriores -->
      <q-banner v-if="pendencias.length" dense class="bg-orange-1 text-orange-10 rounded-borders q-mb-md">
        <q-icon name="history" class="q-mr-xs" />
        Você tem {{ pendencias.length }} pendência(s) de meses anteriores somando
        {{ brl(resumo?.pendenteAnterior) }}.
        <template v-slot:action>
          <q-btn flat dense color="orange" label="Ver detalhes" @click="mostrarPendencias = !mostrarPendencias" />
        </template>
      </q-banner>

      <q-card v-if="pendencias.length && mostrarPendencias" flat bordered class="rounded-borders q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 text-orange-9 q-mb-sm">Pendências anteriores</div>
          <div v-for="item in pendencias" :key="item.id" class="row items-center q-py-xs">
            <q-icon name="pending" color="orange" size="18px" class="q-mr-sm" />
            <div class="col">
              <div class="text-body2">{{ item.desc }}</div>
              <div class="text-caption text-grey-8">{{ item.rotuloOrigem }} · dia {{ item.vencimentoDia }}</div>
            </div>
            <div class="text-body2 text-orange-9">{{ brl(item.valor) }}</div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Filtros -->
      <q-card flat bordered class="rounded-borders q-mb-md">
        <q-card-section class="q-pb-sm">
          <filtro-lancamentos
            v-model="filtros"
            :itens="mes?.itens || []"
            :cartoes="cards.cards"
            @limpar="limparFiltros"
          />
        </q-card-section>
        <q-separator v-if="filtrando" />
        <q-card-section v-if="filtrando" class="row items-center q-py-sm text-caption text-grey-8">
          <q-icon name="filter_alt" size="18px" class="q-mr-xs" />
          Mostrando {{ filtroResumo.quantidade }} de {{ mes?.itens?.length || 0 }} lançamento(s)
          · total {{ brl(filtroResumo.total) }}
          <span v-if="filtroResumo.totalPendente"> · pendente {{ brl(filtroResumo.totalPendente) }}</span>
        </q-card-section>
      </q-card>

      <!-- Lançamentos por dia -->
      <q-card flat bordered class="rounded-borders">
        <q-card-section class="row items-center">
          <div class="text-subtitle1 text-weight-medium">Lançamentos</div>
          <q-space />
          <q-btn
            dense
            flat
            color="primary"
            icon="add"
            label="Adicionar"
            @click="novoLancamento"
          />
        </q-card-section>
        <q-separator />

        <div v-if="!mes?.itens?.length" class="q-pa-lg text-center">
          <q-icon name="receipt_long" size="3rem" color="grey-4" />
          <div class="text-caption text-grey-6 q-mt-sm">
            Nenhum lançamento em {{ mes?.rotulo }}. Use “Novo lançamento” para começar.
          </div>
        </div>

        <div v-else-if="!gruposPorDia.length" class="q-pa-lg text-center">
          <q-icon name="search_off" size="3rem" color="grey-4" />
          <div class="text-caption text-grey-6 q-mt-sm">
            Nenhum lançamento corresponde aos filtros aplicados.
          </div>
          <q-btn class="q-mt-sm" flat color="primary" label="Limpar filtros" @click="limparFiltros" />
        </div>

        <q-list v-else separator>
          <q-item v-for="grupo in gruposPorDia" :key="grupo.dia">
            <q-item-section>
              <q-item-label class="text-weight-medium">
                <q-icon name="event" size="18px" class="q-mr-xs" />
                Dia {{ grupo.dia }}
              </q-item-label>
              <q-item-label caption>
                {{ diaResumo(grupo) }}
              </q-item-label>

              <div class="q-mt-sm">
                <q-list dense>
                  <q-item
                    v-for="item in grupo.itens"
                    :key="item.id"
                    class="rounded-borders"
                    :class="{ 'bg-green-1': item.pago }"
                  >
                    <q-item-section side>
                      <q-checkbox
                        :model-value="item.pago"
                        color="positive"
                        @update:model-value="abrirPagamento(item)"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label :class="{ 'text-strike text-grey-6': item.pago }">
                        {{ item.desc }}
                        <q-badge
                          v-if="item.parcelas"
                          color="primary"
                          class="q-ml-xs"
                          :label="`${item.parcelas.atual}/${item.parcelas.total}`"
                        />
                      </q-item-label>
                      <q-item-label caption>
                        {{ item.categoria }}
                        <span v-if="item.cartaoId"> · {{ nomeCartao(item.cartaoId) }}</span>
                        <span v-if="item.pago && item.dataPagamento">
                          · pago em {{ dataBR(item.dataPagamento) }}
                        </span>
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="text-body1 text-weight-medium">{{ brl(item.valor) }}</div>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn dense flat size="sm" icon="edit" color="grey-6" @click="editarLancamento(item)">
                        <q-tooltip>Editar</q-tooltip>
                      </q-btn>
                      <q-btn dense flat size="sm" icon="delete" color="grey-6" @click="removerLancamento(item)">
                        <q-tooltip>Remover</q-tooltip>
                      </q-btn>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </template>

    <lancamento-dialog
      v-model="dialogLancamento"
      :mes-id="plan.mesAtualId"
      :item="itemEditando"
      @saved="plan.reload()"
    />

    <pagamento-dialog
      v-model="dialogPagamento"
      :item="itemPagamento"
      :mes-id="plan.mesAtualId"
      @saved="plan.reload()"
    />

    <q-dialog v-model="dialogEntrada">
      <q-card style="min-width: 320px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Nova entrada</div>
          <q-space />
          <q-btn v-close-popup dense flat icon="close" round />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="entrada.desc" label="Descrição" outlined dense />
          <q-input v-model.number="entrada.valor" label="Valor (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <q-select v-model.number="entrada.dia" :options="diasEntrada" option-value="value" option-label="label"
                    emit-value map-options label="Dia de recebimento" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-gutter-sm">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn color="primary" label="Adicionar" :disable="!entrada.desc || entrada.valor <= 0" @click="salvarEntrada" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { usePlanStore } from 'src/stores/plan'
import { useCardStore } from 'src/stores/cards'
import { brl, dataBR } from 'src/utils/format'
import { addMonths, monthLabel } from 'src/utils/dates'
import { itensPorDia, saldoDoDia } from 'src/services/calc/cashflow'
import { filtroAtivo, filtroVazio, filtrarItens, resumoFiltro } from 'src/services/calc/filters'
import LancamentoDialog from 'src/components/plan/LancamentoDialog.vue'
import PagamentoDialog from 'src/components/plan/PagamentoDialog.vue'
import FiltroLancamentos from 'src/components/plan/FiltroLancamentos.vue'

const $q = useQuasar()
const plan = usePlanStore()
const cards = useCardStore()

const dialogLancamento = ref(false)
const dialogPagamento = ref(false)
const dialogEntrada = ref(false)
const itemEditando = ref(null)
const itemPagamento = ref(null)
const mostrarPendencias = ref(false)
const filtros = ref(filtroVazio())

const entrada = ref({ desc: '', valor: 0, dia: 10 })

const diasEntrada = Array.from({ length: 28 }, (_, i) => i + 1).map((d) => ({
  label: `Dia ${d}`,
  value: d,
}))

const mes = computed(() => plan.mesAtual)
const resumo = computed(() => plan.resumoAtual)
const pendencias = computed(() => plan.pendenciasDoMesAtual)
const filtrando = computed(() => filtroAtivo(filtros.value))
const itensFiltrados = computed(() => filtrarItens(mes.value?.itens || [], filtros.value))
const filtroResumo = computed(() => resumoFiltro(itensFiltrados.value))
const gruposPorDia = computed(() =>
  itensPorDia({ itens: itensFiltrados.value }).filter((g) => g.itens.length)
)

function diaResumo(grupo) {
  if (filtrando.value) {
    const total = grupo.itens.reduce((a, i) => a + (Number(i.valor) || 0), 0)
    return `${grupo.itens.length} lançamento(s) · total ${brl(total)}`
  }
  const s = saldoDoDia(mes.value, grupo.dia, pendencias.value)
  const partes = []
  if (s.entrada) partes.push(`entrada ${brl(s.entrada)}`)
  if (s.aPagar) partes.push(`a pagar ${brl(s.aPagar)}`)
  partes.push(`saldo ${brl(s.saldo)}`)
  return partes.join(' · ')
}

function limparFiltros() {
  filtros.value = filtroVazio()
}

function nomeCartao(cartaoId) {
  const card = cards.cards.find((c) => c.id === cartaoId)
  return card ? card.nome : ''
}

function novoLancamento() {
  itemEditando.value = null
  dialogLancamento.value = true
}

function editarLancamento(item) {
  itemEditando.value = item
  dialogLancamento.value = true
}

function abrirPagamento(item) {
  itemPagamento.value = item
  dialogPagamento.value = true
}

function novaEntrada() {
  entrada.value = { desc: '', valor: 0, dia: 10 }
  dialogEntrada.value = true
}

async function salvarEntrada() {
  await plan.upsertEntrada(plan.mesAtualId, entrada.value)
  dialogEntrada.value = false
  $q.notify({ color: 'positive', icon: 'check_circle', message: 'Entrada adicionada.' })
}

async function removerEntrada(entradaItem) {
  await plan.removeEntrada(plan.mesAtualId, entradaItem.id)
}

async function removerLancamento(item) {
  await plan.removeItem(plan.mesAtualId, item.id)
  $q.notify({ color: 'positive', icon: 'delete', message: 'Lançamento removido.' })
}

async function clonarMes() {
  const origem = plan.mesAtualId
  const proximo = addMonths(origem, 1)
  await plan.cloneMes(origem, proximo)
  plan.setMesAtual(proximo)
  $q.notify({
    color: 'positive',
    icon: 'content_copy',
    message: `Mês ${monthLabel(proximo)} criado a partir de ${monthLabel(origem)}.`,
  })
}

onMounted(async () => {
  await Promise.all([plan.init(), cards.init()])
})
</script>
