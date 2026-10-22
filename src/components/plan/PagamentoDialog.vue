<template>
  <q-dialog v-model="visible">
    <q-card style="min-width: 320px" class="rounded-borders">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Registrar pagamento</div>
        <q-space />
        <q-btn v-close-popup dense flat icon="close" round />
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <div class="text-subtitle2 text-grey-8">{{ item?.desc }}</div>
        <div class="text-h5 text-primary">{{ brl(item?.valor) }}</div>

        <q-input
          v-model="dataPagamento"
          label="Data do pagamento"
          type="date"
          outlined
          dense
        />

        <q-input
          v-model.number="valorPago"
          label="Valor pago (R$)"
          type="number"
          step="0.01"
          min="0"
          outlined
          dense
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-gutter-sm">
        <q-btn
          v-if="item?.pago"
          flat
          color="negative"
          label="Desmarcar"
          @click="desmarcar"
        />
        <q-space />
        <q-btn v-close-popup flat label="Cancelar" />
        <q-btn color="primary" label="Confirmar" :loading="saving" @click="confirmar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { usePlanStore } from 'src/stores/plan'
import { brl } from 'src/utils/format'
import { todayISO } from 'src/utils/dates'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  item: { type: Object, default: null },
  mesId: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const plan = usePlanStore()

const saving = ref(false)
const dataPagamento = ref(todayISO())
const valorPago = ref(0)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.item) return
    dataPagamento.value = todayISO()
    valorPago.value = props.item.valor || 0
  }
)

async function confirmar() {
  saving.value = true
  try {
    await plan.togglePago(props.mesId, props.item.id, {
      dataPagamento: dataPagamento.value,
      valorPago: valorPago.value,
    })
    emit('saved')
    visible.value = false
    $q.notify({ color: 'positive', icon: 'check_circle', message: 'Pagamento registrado.' })
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message })
  } finally {
    saving.value = false
  }
}

async function desmarcar() {
  saving.value = true
  try {
    await plan.togglePago(props.mesId, props.item.id)
    emit('saved')
    visible.value = false
    $q.notify({ color: 'positive', icon: 'undo', message: 'Pagamento desfeito.' })
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message })
  } finally {
    saving.value = false
  }
}
</script>
