<template>
  <q-dialog v-model="visible" full-width>
    <q-card style="max-width: 980px" class="rounded-borders">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-h6">
            <q-icon name="insights" class="q-mr-sm" />
            Simulador de quitação
          </div>
          <div class="text-caption text-grey-7">
            Compare estratégias e veja quantos meses e quanto de juros você economiza.
          </div>
        </div>
        <q-space />
        <q-btn v-close-popup dense flat icon="close" round />
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-4">
            <q-input
              v-model.number="aporteExtra"
              label="Aporte extra por mês (R$)"
              type="number"
              step="50"
              min="0"
              outlined
              dense
            >
              <template #prepend>R$</template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4">
            <q-input
              v-model.number="dyAnual"
              label="DY anual da carteira (%)"
              type="number"
              step="0.5"
              min="0"
              outlined
              dense
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-input
              v-model.number="mesesComparacao"
              label="Horizonte (meses)"
              type="number"
              min="1"
              max="120"
              outlined
              dense
            />
          </div>
        </div>

        <q-banner v-if="!dividas.length" dense class="bg-blue-1 text-blue-9" rounded>
          Nenhuma dívida em aberto. Registre uma dívida para simular a quitação.
        </q-banner>

        <template v-else>
          <div class="row q-col-gutter-md">
            <div v-for="estrategia in estrategias" :key="estrategia.chave" class="col-12 col-md-4">
              <q-card flat bordered class="fit" :class="destaque(estrategia.chave)">
                <q-card-section class="q-pb-xs">
                  <div class="text-subtitle1 text-weight-medium">{{ estrategia.rotulo }}</div>
                  <div class="text-caption text-grey-7">{{ estrategia.descricao }}</div>
                </q-card-section>
                <q-separator />
                <q-card-section class="q-gutter-y-xs">
                  <div class="row justify-between">
                    <span class="text-grey-7">Tempo até zerar</span>
                    <strong>{{ estrategia.meses }} meses</strong>
                  </div>
                  <div class="row justify-between">
                    <span class="text-grey-7">Juros pagos</span>
                    <strong class="text-negative">{{ brl(estrategia.totalJuros) }}</strong>
                  </div>
                  <div class="row justify-between">
                    <span class="text-grey-7">Economia de juros</span>
                    <strong class="text-positive">{{ brl(estrategia.economiaJuros) }}</strong>
                  </div>
                  <div class="row justify-between">
                    <span class="text-grey-7">Meses economizados</span>
                    <strong>{{ estrategia.mesesEconomizados }}</strong>
                  </div>
                  <div v-if="estrategia.ordem.length" class="text-caption text-grey-7 q-mt-sm">
                    Ordem: {{ estrategia.ordem.map((o) => o.descricao).join(' → ') }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-expansion-item
            icon="receipt_long"
            label="Detalhe por dívida (Price × SAC)"
            caption="Parcela, juros totais e comparação entre os sistemas de amortização"
            header-class="text-subtitle2"
          >
            <q-markup-table flat bordered dense>
              <thead>
                <tr>
                  <th class="text-left">Dívida</th>
                  <th class="text-right">Saldo</th>
                  <th class="text-right">Taxa</th>
                  <th class="text-right">Parcela Price</th>
                  <th class="text-right">Juros Price</th>
                  <th class="text-right">1ª SAC</th>
                  <th class="text-right">Juros SAC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="linha in detalhes" :key="linha.id">
                  <td class="text-left">{{ linha.descricao }}</td>
                  <td class="text-right">{{ brl(linha.saldo) }}</td>
                  <td class="text-right">{{ linha.taxa }}% a.m.</td>
                  <td class="text-right">{{ brl(linha.parcelaPrice) }}</td>
                  <td class="text-right">{{ brl(linha.jurosPrice) }}</td>
                  <td class="text-right">{{ brl(linha.parcelaSac) }}</td>
                  <td class="text-right">{{ brl(linha.jurosSac) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-expansion-item>

          <q-expansion-item
            icon="balance"
            label="Pagar a dívida ou investir?"
            caption="Custo dos juros no horizonte contra o rendimento do mesmo aporte"
            header-class="text-subtitle2"
          >
            <div class="q-pa-md q-gutter-y-sm">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <q-card flat bordered class="q-pa-md">
                    <div class="text-caption text-grey-7">Custo dos juros</div>
                    <div class="text-h6 text-negative">{{ brl(pagarVsInvestir.custoJuros) }}</div>
                  </q-card>
                </div>
                <div class="col-12 col-sm-4">
                  <q-card flat bordered class="q-pa-md">
                    <div class="text-caption text-grey-7">Rendimento do aporte</div>
                    <div class="text-h6 text-positive">{{ brl(pagarVsInvestir.rendimento) }}</div>
                  </q-card>
                </div>
                <div class="col-12 col-sm-4">
                  <q-card flat bordered class="q-pa-md" :class="pagarVsInvestir.vantagem >= 0 ? 'bg-green-1' : 'bg-red-1'">
                    <div class="text-caption text-grey-7">Vantagem</div>
                    <div class="text-h6">{{ brl(Math.abs(pagarVsInvestir.vantagem)) }}</div>
                  </q-card>
                </div>
              </div>
              <q-banner dense rounded :class="pagarVsInvestir.recomendacao === 'investir' ? 'bg-green-1 text-green-9' : 'bg-orange-1 text-orange-9'">
                <q-icon :name="pagarVsInvestir.recomendacao === 'investir' ? 'trending_up' : 'savings'" class="q-mr-xs" />
                {{
                  pagarVsInvestir.recomendacao === 'investir'
                    ? `Com DY de ${dyAnual}% a.a., investir o aporte rende mais que o custo da dívida neste horizonte.`
                    : `O custo da dívida supera o rendimento esperado — priorize a amortização.`
                }}
              </q-banner>
              <div class="text-caption text-grey-7">
                Estimativa simplificada: juros da dívida sobre o saldo total em {{ mesesComparacao }} meses
                contra o valor futuro de {{ brl(aporteExtra) }} por mês. Não substitui uma análise completa.
              </div>
            </div>
          </q-expansion-item>
        </template>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn v-close-popup flat label="Fechar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { brl } from 'src/utils/format'
import {
  compararTresEstrategias,
  cronogramaPrice,
  cronogramaSac,
  pagarVsInvestir as calcularPagarVsInvestir,
} from 'src/services/calc/amortization'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  dividas: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const aporteExtra = ref(1000)
const dyAnual = ref(8)
const mesesComparacao = ref(12)

const rotulos = {
  avalanche: {
    rotulo: 'Avalanche',
    descricao: 'Quita primeiro a dívida com maior taxa de juros.',
  },
  bolaDeNeve: {
    rotulo: 'Bola de neve',
    descricao: 'Quita primeiro a menor dívida, liberando parcelas mais rápido.',
  },
  menorTaxa: {
    rotulo: 'Menor taxa',
    descricao: 'Quita primeiro a dívida mais barata, mantendo o saldo caro por mais tempo.',
  },
}

const resultados = computed(() =>
  compararTresEstrategias({ dividas: props.dividas, aporteExtra: aporteExtra.value })
)

const estrategias = computed(() =>
  Object.keys(rotulos).map((chave, indice) => ({
    chave,
    ...rotulos[chave],
    ...resultados.value[indice],
  }))
)

const melhor = computed(() => {
  const ordenadas = [...estrategias.value].sort((a, b) => a.totalJuros - b.totalJuros)
  return ordenadas[0]?.chave || 'avalanche'
})

function destaque(chave) {
  return chave === melhor.value ? 'bg-green-1' : ''
}

const detalhes = computed(() =>
  props.dividas.map((d) => {
    const taxa = Math.max(0, Number(d.taxaJuros || 0) / 100)
    const price = cronogramaPrice({ saldo: d.saldo, taxaMensal: taxa, parcelas: d.parcelas || 1 })
    const sac = cronogramaSac({ saldo: d.saldo, taxaMensal: taxa, parcelas: d.parcelas || 1 })
    return {
      id: d.id,
      descricao: d.descricao || d.nome || 'Dívida',
      saldo: d.saldo,
      taxa: Number(d.taxaJuros || 0),
      parcelaPrice: price.parcela,
      jurosPrice: price.totalJuros,
      parcelaSac: sac.parcelaInicial,
      jurosSac: sac.totalJuros,
    }
  })
)

const pagarVsInvestir = computed(() => {
  const saldo = props.dividas.reduce((a, d) => a + (Number(d.saldo) || 0), 0)
  const taxaMedia = saldo
    ? props.dividas.reduce((a, d) => a + (Number(d.saldo) || 0) * (Number(d.taxaJuros || 0) / 100), 0) / saldo
    : 0
  return calcularPagarVsInvestir({
    saldo,
    taxaDividaMensal: taxaMedia,
    dyAnualPercentual: dyAnual.value,
    aporteMensal: aporteExtra.value,
    meses: mesesComparacao.value,
  })
})
</script>
