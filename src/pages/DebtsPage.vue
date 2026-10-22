<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Dívidas</div>
        <div class="text-caption text-grey-8">Saldo devedor total: {{ brl(debts.totalDevido) }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn
          v-if="debts.openDebts.length"
          outline
          color="primary"
          icon="insights"
          label="Simulador"
          @click="simulador = true"
        />
        <q-btn color="primary" icon="add" label="Nova dívida" @click="novaDivida" />
      </div>
    </div>

    <div v-if="debts.loading" class="q-pa-lg"><q-inner-loading showing color="primary" /></div>

    <div v-else-if="!debts.debts.length" class="q-pa-lg text-center">
      <q-icon name="handshake" size="4rem" color="grey-4" />
      <div class="text-h6 text-grey-7 q-mt-sm">Nenhuma dívida registrada</div>
      <div class="text-caption text-grey-6 q-mb-md">Registre empréstimos e financiamentos para acompanhar a evolução.</div>
      <q-btn color="primary" icon="add" label="Nova dívida" @click="novaDivida" />
    </div>

    <q-table
      v-else
      flat
      bordered
      row-key="id"
      :rows="debts.debts"
      :columns="columns"
      :pagination="rowsPerPage"
      class="rounded-borders"
    >
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn dense flat size="sm" icon="edit" color="grey-7" @click="editarDivida(props.row)">
            <q-tooltip>Editar</q-tooltip>
          </q-btn>
          <q-btn
            v-if="!props.row.quitada"
            dense
            flat
            size="sm"
            icon="done_all"
            color="positive"
            @click="quitar(props.row)"
          >
            <q-tooltip>Quitar dívida</q-tooltip>
          </q-btn>
          <q-btn dense flat size="sm" icon="delete" color="grey-7" @click="removerDivida(props.row)">
            <q-tooltip>Excluir</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 360px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editando ? 'Editar dívida' : 'Nova dívida' }}</div>
          <q-space />
          <q-btn v-close-popup dense flat icon="close" round />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.descricao" label="Descrição" outlined dense />
          <q-input v-model="form.credor" label="Credor" outlined dense />
          <q-input v-model.number="form.valorOriginal" label="Valor original (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <q-input v-model.number="form.saldo" label="Saldo atual (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <div class="row q-col-gutter-sm">
            <div class="col-4">
              <q-input v-model.number="form.parcelas" label="Parcelas" type="number" min="1" outlined dense />
            </div>
            <div class="col-4">
              <q-input v-model.number="form.taxaJuros" label="Juros % a.m." type="number" step="0.01" outlined dense />
            </div>
            <div class="col-4">
              <q-input v-model.number="form.diaVencimento" label="Vencimento (dia)" type="number" min="1" max="31" outlined dense />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-gutter-sm">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn color="primary" :label="editando ? 'Salvar' : 'Adicionar'" :disable="!form.descricao" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <simulador-dividas v-model="simulador" :dividas="debts.openDebts" />
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useDebtStore } from 'src/stores/debts'
import SimuladorDividas from 'src/components/debts/SimuladorDividas.vue'
import { brl } from 'src/utils/format'

const $q = useQuasar()
const debts = useDebtStore()

const dialog = ref(false)
const simulador = ref(false)
const editando = ref(null)
const rowsPerPage = { rowsPerPage: 0 }

const form = ref({
  descricao: '',
  credor: '',
  valorOriginal: 0,
  saldo: 0,
  parcelas: 1,
  taxaJuros: 0,
  diaVencimento: 10,
})

const columns = [
  { name: 'descricao', label: 'Descrição', field: 'descricao', align: 'left', sortable: true },
  { name: 'credor', label: 'Credor', field: 'credor', align: 'left' },
  { name: 'saldo', label: 'Saldo', field: 'saldo', align: 'right', format: (v) => brl(v) },
  { name: 'parcelas', label: 'Parcelas', field: 'parcelas', align: 'center' },
  { name: 'taxaJuros', label: 'Juros', field: 'taxaJuros', align: 'right', format: (v) => `${v}%` },
  { name: 'acoes', label: '', field: 'acoes', align: 'right' },
]

function novaDivida() {
  editando.value = null
  form.value = {
    descricao: '',
    credor: '',
    valorOriginal: 0,
    saldo: 0,
    parcelas: 1,
    taxaJuros: 0,
    diaVencimento: 10,
  }
  dialog.value = true
}

function editarDivida(debt) {
  editando.value = debt
  form.value = { ...debt }
  dialog.value = true
}

async function salvar() {
  if (editando.value) {
    await debts.updateDebt({ id: editando.value.id, ...form.value })
  } else {
    await debts.createDebt(form.value)
  }
  dialog.value = false
  $q.notify({ color: 'positive', icon: 'check_circle', message: 'Dívida salva.' })
}

async function quitar(debt) {
  await debts.settleDebt(debt.id)
  $q.notify({ color: 'positive', icon: 'done_all', message: 'Dívida quitada.' })
}

async function removerDivida(debt) {
  await debts.deleteDebt(debt.id)
  $q.notify({ color: 'positive', icon: 'delete', message: 'Dívida removida.' })
}

onMounted(() => debts.init())
</script>
