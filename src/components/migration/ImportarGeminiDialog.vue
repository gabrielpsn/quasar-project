<template>
  <q-dialog v-model="visible" full-width>
    <q-card style="max-width: 760px" class="rounded-borders">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-h6">
            <q-icon name="move_up" class="q-mr-sm" />
            Importar do Gemini v22
          </div>
          <div class="text-caption text-grey-7">
            Traz meses, entradas, pagamentos e a carteira do app antigo para os arquivos .txt.
          </div>
        </div>
        <q-space />
        <q-btn v-close-popup dense flat icon="close" round />
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <q-banner dense class="bg-blue-1 text-blue-9" rounded>
          No app antigo, abra o console do navegador e rode
          <code>copy(JSON.stringify(localStorage))</code>, depois cole o conteúdo abaixo.
        </q-banner>

        <q-input
          v-model="texto"
          type="textarea"
          label="JSON do localStorage (fin_db_v22 / inv_db_v22)"
          outlined
          autogrow
          input-style="min-height: 140px; max-height: 260px; font-family: monospace; font-size: 12px"
        />

        <div class="row items-center q-gutter-sm">
          <q-btn
            outline
            color="primary"
            icon="content_paste_go"
            label="Ler deste navegador"
            @click="lerLocalStorage"
          />
          <q-space />
          <q-toggle v-model="substituir" label="Substituir dados atuais" />
          <q-btn
            color="primary"
            icon="manage_search"
            label="Analisar"
            :disable="!texto.trim()"
            @click="analisar"
          />
        </div>

        <q-banner v-if="erro" dense class="bg-red-1 text-red-9" rounded>
          <q-icon name="error" class="q-mr-xs" />{{ erro }}
        </q-banner>

        <template v-if="resultado">
          <q-separator />
          <div class="row q-col-gutter-sm">
            <div v-for="cartao in resumo" :key="cartao.rotulo" class="col-6 col-sm-3">
              <q-card flat bordered class="q-pa-sm text-center">
                <div class="text-caption text-grey-7">{{ cartao.rotulo }}</div>
                <div class="text-h6">{{ cartao.valor }}</div>
              </q-card>
            </div>
          </div>

          <div v-if="resultado.warnings.length" class="q-mt-sm">
            <div class="text-subtitle2">
              <q-icon name="warning" color="orange" class="q-mr-xs" />
              {{ resultado.warnings.length }} aviso(s)
            </div>
            <q-list dense class="bg-orange-1 rounded-borders q-pa-sm" style="max-height: 160px; overflow: auto">
              <q-item v-for="(aviso, i) in resultado.warnings" :key="i">
                <q-item-section class="text-caption">{{ aviso }}</q-item-section>
              </q-item>
            </q-list>
          </div>
        </template>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-gutter-sm">
        <q-btn v-close-popup flat label="Cancelar" />
        <q-btn
          color="primary"
          icon="download_done"
          label="Importar"
          :disable="!resultado"
          :loading="importando"
          @click="importar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { convertGeminiV22, extractLegacyPayload } from 'src/services/migration/geminiV22'
import { applyGeminiV22 } from 'src/services/migration/applyGeminiV22'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'imported'])

const $q = useQuasar()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const texto = ref('')
const substituir = ref(true)
const erro = ref('')
const resultado = ref(null)
const importando = ref(false)

const resumo = computed(() => {
  const s = resultado.value?.summary
  if (!s) return []
  return [
    { rotulo: 'Meses', valor: s.meses },
    { rotulo: 'Entradas', valor: s.entradas },
    { rotulo: 'Lançamentos', valor: s.itens },
    { rotulo: 'Já pagos', valor: s.pagos },
    { rotulo: 'Investimentos', valor: s.investimentos },
  ]
})

function analisar() {
  erro.value = ''
  resultado.value = null
  try {
    const payload = extractLegacyPayload(texto.value)
    resultado.value = convertGeminiV22(payload)
    if (!resultado.value.plan.meses.length && !resultado.value.investments.length) {
      erro.value = 'Nada para importar: nenhum mês ou investimento encontrado.'
      resultado.value = null
    }
  } catch (error) {
    erro.value = error.message
  }
}

function lerLocalStorage() {
  const chaves = Object.keys(localStorage).filter((k) => k.startsWith('v22_') || k.startsWith('fin_db') || k.startsWith('inv_db'))
  if (!chaves.length) {
    $q.notify({
      color: 'warning',
      icon: 'info',
      message: 'Nenhum dado do Gemini v22 neste navegador. Cole o JSON exportado do app antigo.',
    })
    return
  }
  texto.value = JSON.stringify(localStorage)
  analisar()
}

async function importar() {
  if (!resultado.value) return
  importando.value = true
  try {
    const summary = await applyGeminiV22(resultado.value, { replace: substituir.value })
    $q.notify({
      color: 'positive',
      icon: 'download_done',
      message: `Importados ${summary.meses} mês(es), ${summary.itens} lançamento(s) e ${summary.investimentos} investimento(s). Recarregando…`,
    })
    emit('update:modelValue', false)
    emit('imported')
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    $q.notify({
      color: 'negative',
      icon: 'error',
      message: error?.message || 'Falha ao importar os dados.',
      timeout: 7000,
    })
  } finally {
    importando.value = false
  }
}
</script>
