<template>
  <q-dialog v-model="visible" persistent>
    <q-card style="min-width: 340px; max-width: 520px" class="rounded-borders">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ editando ? 'Editar lançamento' : 'Novo lançamento' }}</div>
        <q-space />
        <q-btn v-close-popup dense flat icon="close" round />
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-select
          v-model="form.mesId"
          :options="mesesOptions"
          option-value="value"
          option-label="label"
          emit-value
          map-options
          label="Mês de referência"
          outlined
          dense
        />

        <q-select
          v-model="form.categoria"
          :options="categoriasOptions"
          label="Categoria"
          outlined
          dense
          @update:model-value="onCategoriaChange"
        />

        <q-input
          v-model="form.desc"
          label="Descrição"
          outlined
          dense
          autofocus
        />

        <q-input
          v-model.number="form.valor"
          label="Valor (R$)"
          type="number"
          step="0.01"
          min="0"
          outlined
          dense
        >
          <template #prepend>R$</template>
        </q-input>

        <q-select
          v-model.number="form.vencimentoDia"
          :options="diasOptions"
          label="Dia de vencimento"
          outlined
          dense
        />

        <template v-if="form.categoria === 'Cartão'">
          <q-select
            v-model="form.cartaoId"
            :options="cardOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Cartão"
            outlined
            dense
            clearable
          />

          <q-input
            v-model.number="form.parcelas"
            label="Parcelas"
            type="number"
            min="1"
            max="36"
            outlined
            dense
            :hint="parcelasHint"
          />
        </template>

        <template v-if="form.categoria === 'Empréstimo'">
          <q-select
            v-model="form.dividaId"
            :options="debtOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Dívida"
            outlined
            dense
            clearable
          />
        </template>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-gutter-sm">
        <q-btn v-close-popup flat label="Cancelar" />
        <q-btn
          color="primary"
          :label="editando ? 'Salvar' : 'Adicionar'"
          :loading="saving"
          :disable="!podeSalvar"
          @click="salvar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { usePlanStore } from 'src/stores/plan'
import { useCardStore } from 'src/stores/cards'
import { useDebtStore } from 'src/stores/debts'
import { DIAS_VENCIMENTO, monthKeyFromParts, monthLabel, currentMonthKey } from 'src/utils/dates'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mesId: { type: String, default: null },
  item: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const plan = usePlanStore()
const cards = useCardStore()
const debts = useDebtStore()

const saving = ref(false)

const categoriasOptions = ['Fixo', 'Variável', 'Cartão', 'Empréstimo']

const defaultForm = () => ({
  mesId: props.mesId || currentMonthKey(),
  categoria: 'Fixo',
  desc: '',
  valor: 0,
  vencimentoDia: 10,
  cartaoId: null,
  dividaId: null,
  parcelas: 1,
})

const form = ref(defaultForm())

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const editando = computed(() => !!props.item)

const mesesOptions = computed(() => {
  const lista = plan.mesesOrdenados.map((m) => ({ label: m.rotulo || monthLabel(m.id), value: m.id }))
  const anoAtual = Number(currentMonthKey().slice(0, 4))
  const mesAtual = Number(currentMonthKey().slice(5, 7))
  for (let i = 0; i < 6; i++) {
    const key = monthKeyFromParts(anoAtual, mesAtual + i)
    if (!lista.some((o) => o.value === key)) lista.push({ label: monthLabel(key), value: key })
  }
  return lista.sort((a, b) => (a.value < b.value ? -1 : 1))
})

const diasOptions = computed(() => {
  const base = DIAS_VENCIMENTO.map((d) => ({ label: `Dia ${d}`, value: d }))
  const extras = Array.from({ length: 28 }, (_, i) => i + 1)
    .filter((d) => !DIAS_VENCIMENTO.includes(d))
    .map((d) => ({ label: `Dia ${d}`, value: d }))
  return [...base, ...extras]
})

const cardOptions = computed(() => cards.cardOptions)
const debtOptions = computed(() => debts.debtOptions)

const parcelasHint = computed(() => {
  const n = Number(form.value.parcelas) || 1
  if (n <= 1) return 'Pagamento à vista'
  const total = Number(form.value.valor) || 0
  return `${n}x de R$ ${(total / n).toFixed(2).replace('.', ',')}`
})

const podeSalvar = computed(() => {
  if (!form.value.mesId) return false
  if (!form.value.desc?.trim()) return false
  return Number(form.value.valor) > 0
})

function onCategoriaChange(categoria) {
  if (categoria !== 'Cartão') form.value.parcelas = 1
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.item) {
      form.value = {
        mesId: props.item.mesRef || props.mesId || currentMonthKey(),
        categoria: props.item.categoria || 'Fixo',
        desc: props.item.desc || '',
        valor: props.item.valor || 0,
        vencimentoDia: props.item.vencimentoDia || 10,
        cartaoId: props.item.cartaoId || null,
        dividaId: props.item.dividaId || null,
        parcelas: props.item.parcelas?.total || 1,
      }
    } else {
      form.value = defaultForm()
    }
    cards.init()
    debts.init()
  }
)

async function salvar() {
  saving.value = true
  try {
    if (editando.value) {
      await plan.updateItem(props.item.mesRef, props.item.id, {
        desc: form.value.desc.trim(),
        valor: form.value.valor,
        categoria: form.value.categoria,
        vencimentoDia: form.value.vencimentoDia,
        cartaoId: form.value.cartaoId,
        dividaId: form.value.dividaId,
      })
    } else if (Number(form.value.parcelas) > 1) {
      await plan.addParcelamento({
        mesInicial: form.value.mesId,
        desc: form.value.desc.trim(),
        valorTotal: form.value.valor,
        parcelas: Number(form.value.parcelas),
        vencimentoDia: form.value.vencimentoDia,
        categoria: form.value.categoria,
        cartaoId: form.value.cartaoId,
        dividaId: form.value.dividaId,
      })
    } else {
      await plan.addItem(form.value.mesId, {
        desc: form.value.desc.trim(),
        valor: form.value.valor,
        categoria: form.value.categoria,
        vencimentoDia: form.value.vencimentoDia,
        cartaoId: form.value.cartaoId,
        dividaId: form.value.dividaId,
      })
    }

    emit('saved')
    visible.value = false
    $q.notify({ color: 'positive', icon: 'check_circle', message: 'Lançamento salvo.' })
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message })
  } finally {
    saving.value = false
  }
}
</script>
