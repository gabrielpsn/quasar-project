<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Cartões</div>
        <div class="text-caption text-grey-8">Faturas, limites e comprometimento da renda</div>
      </div>
      <div class="row q-gutter-sm items-center">
        <q-select
          v-if="mesOptions.length"
          v-model="mesRef"
          :options="mesOptions"
          option-value="value"
          option-label="label"
          emit-value
          map-options
          label="Mês da fatura"
          outlined
          dense
          style="min-width: 170px"
        />
        <q-btn color="primary" icon="add" label="Novo cartão" @click="novoCartao" />
      </div>
    </div>

    <q-banner
      v-if="cards.cards.length && totalFaturas"
      dense
      rounded
      class="q-mb-md"
      :class="corComprometimento.banner"
    >
      <div class="row items-center">
        <q-icon :name="corComprometimento.icon" class="q-mr-sm" />
        <div class="col">
          Faturas de {{ rotuloMes }}: <strong>{{ brl(totalFaturas) }}</strong>
          · {{ percentual(comprometimento) }} da renda ({{ brl(renda) }})
        </div>
        <q-badge :color="corComprometimento.badge" :label="corComprometimento.rotulo" />
      </div>
    </q-banner>

    <div v-if="cards.loading" class="q-pa-lg"><q-inner-loading showing color="primary" /></div>

    <div v-else-if="!cards.cards.length" class="q-pa-lg text-center">
      <q-icon name="credit_card" size="4rem" color="grey-4" />
      <div class="text-h6 text-grey-7 q-mt-sm">Nenhum cartão cadastrado</div>
      <div class="text-caption text-grey-6 q-mb-md">Cadastre seus cartões para acompanhar limites e faturas.</div>
      <q-btn color="primary" icon="add" label="Novo cartão" @click="novoCartao" />
    </div>

    <div v-else class="row q-col-gutter-md">
      <div v-for="card in cards.cards" :key="card.id" class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="credit_card" :color="card.cor" size="28px" />
              <q-space />
              <q-btn dense flat size="sm" icon="more_vert" color="grey-7">
                <q-menu>
                  <q-list dense style="min-width: 150px">
                    <q-item v-close-popup clickable @click="editarCartao(card)">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="removerCartao(card)">
                      <q-item-section avatar><q-icon name="delete" color="negative" /></q-item-section>
                      <q-item-section class="text-negative">Excluir</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
            <div class="text-subtitle1 q-mt-sm">{{ card.nome }}</div>
            <div class="text-caption text-grey-8">{{ card.bandeira }} · fecha dia {{ card.diaFechamento }} · vence dia {{ card.diaVencimento }}</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row items-baseline justify-between">
              <div>
                <div class="text-caption text-grey-8">Fatura de {{ rotuloMes }}</div>
                <div class="text-h6" :class="{ 'text-negative': faturaDoCartao(card) > 0 }">
                  {{ brl(faturaDoCartao(card)) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-8">Limite</div>
                <div class="text-body1">{{ brl(card.limite) }}</div>
              </div>
            </div>
            <q-linear-progress
              class="q-mt-sm"
              :value="usoDoCartao(card)"
              :color="usoDoCartao(card) >= 0.8 ? 'negative' : 'primary'"
              track-color="grey-3"
              rounded
            />
            <div class="row justify-between text-caption text-grey-8 q-mt-xs">
              <span>{{ percentual(usoDoCartao(card)) }} do limite</span>
              <span>Em aberto: {{ brl(emAbertoDoCartao(card)) }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 340px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editando ? 'Editar cartão' : 'Novo cartão' }}</div>
          <q-space />
          <q-btn v-close-popup dense flat icon="close" round />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.nome" label="Nome" outlined dense />
          <q-select v-model="form.bandeira" :options="bandeiras" label="Bandeira" outlined dense />
          <q-input v-model.number="form.limite" label="Limite (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="form.diaFechamento" label="Dia de fechamento" type="number" min="1" max="31" outlined dense />
            </div>
            <div class="col-6">
              <q-input v-model.number="form.diaVencimento" label="Dia de vencimento" type="number" min="1" max="31" outlined dense />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-gutter-sm">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn color="primary" :label="editando ? 'Salvar' : 'Adicionar'" :disable="!form.nome" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useCardStore } from 'src/stores/cards'
import { usePlanStore } from 'src/stores/plan'
import { brl, cents, percentual } from 'src/utils/format'
import { currentMonthKey, monthLabel } from 'src/utils/dates'
import { totalEntradas } from 'src/services/calc/cashflow'

const $q = useQuasar()
const cards = useCardStore()
const plan = usePlanStore()

const dialog = ref(false)
const editando = ref(null)

const bandeiras = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outro']

const form = ref({ nome: '', bandeira: 'visa', limite: 0, diaFechamento: 10, diaVencimento: 15 })

const mesRef = ref(null)

const mesOptions = computed(() =>
  plan.mesesOrdenados.map((m) => ({ label: m.rotulo, value: m.id }))
)

const mesSelecionado = computed(() => {
  const id = mesRef.value || plan.mesAtualId || currentMonthKey()
  return plan.meses.find((m) => m.id === id) || plan.mesAtual || null
})

const rotuloMes = computed(() => mesSelecionado.value?.rotulo || monthLabel(mesRef.value || currentMonthKey()))
const renda = computed(() => totalEntradas(mesSelecionado.value))

const faturasDoMes = computed(() => {
  const mapa = new Map()
  ;(mesSelecionado.value?.itens || []).forEach((item) => {
    if (!item.cartaoId) return
    mapa.set(item.cartaoId, cents((mapa.get(item.cartaoId) || 0) + (Number(item.valor) || 0)))
  })
  return mapa
})

const emAberto = computed(() => {
  const mapa = new Map()
  plan.meses.forEach((mes) => {
    mes.itens.forEach((item) => {
      if (!item.cartaoId || item.pago) return
      mapa.set(item.cartaoId, cents((mapa.get(item.cartaoId) || 0) + (Number(item.valor) || 0)))
    })
  })
  return mapa
})

const totalFaturas = computed(() =>
  cents(cards.cards.reduce((acc, card) => acc + faturaDoCartao(card), 0))
)

const comprometimento = computed(() => (renda.value > 0 ? totalFaturas.value / renda.value : 0))

const corComprometimento = computed(() => {
  if (comprometimento.value > 0.3) {
    return {
      banner: 'bg-red-1 text-red-10',
      badge: 'negative',
      icon: 'warning',
      rotulo: 'Acima de 30% da renda',
    }
  }
  if (comprometimento.value > 0.15) {
    return {
      banner: 'bg-orange-1 text-orange-10',
      badge: 'warning',
      icon: 'info',
      rotulo: 'Atenção',
    }
  }
  return {
    banner: 'bg-green-1 text-green-10',
    badge: 'positive',
    icon: 'check_circle',
    rotulo: 'Saudável',
  }
})

function faturaDoCartao(card) {
  return faturasDoMes.value.get(card.id) || 0
}

function emAbertoDoCartao(card) {
  return emAberto.value.get(card.id) || 0
}

function usoDoCartao(card) {
  if (!card.limite) return 0
  return Math.min(1, faturaDoCartao(card) / card.limite)
}

function novoCartao() {
  editando.value = null
  form.value = { nome: '', bandeira: 'visa', limite: 0, diaFechamento: 10, diaVencimento: 15 }
  dialog.value = true
}

function editarCartao(card) {
  editando.value = card
  form.value = { ...card }
  dialog.value = true
}

async function salvar() {
  if (editando.value) {
    await cards.updateCard({ id: editando.value.id, ...form.value })
  } else {
    await cards.createCard(form.value)
  }
  dialog.value = false
  $q.notify({ color: 'positive', icon: 'check_circle', message: 'Cartão salvo.' })
}

async function removerCartao(card) {
  await cards.deleteCard(card.id)
  $q.notify({ color: 'positive', icon: 'delete', message: 'Cartão removido.' })
}

onMounted(async () => {
  await Promise.all([cards.init(), plan.init()])
  const atual = currentMonthKey()
  mesRef.value = plan.meses.some((m) => m.id === atual) ? atual : plan.mesAtualId
})
</script>
