<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Transações</div>
        <div class="text-caption text-grey-8">Visão consolidada de todos os meses</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          color="primary"
          icon="add"
          label="Nova transação"
          @click="showTransactionForm()"
        />
        <q-btn outline color="primary" icon="calendar_month" label="Fluxo de caixa" to="/fluxo-caixa" />
      </div>
    </div>

    <!-- Filtros -->
    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section class="q-gutter-y-md">
        <filtro-lancamentos
          v-model="filtros"
          :itens="transactionStore.all"
          :cartoes="cards.cards"
          @limpar="resetFilters"
        />
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-select
              v-model="filtros.type"
              :options="typeOptions"
              label="Tipo"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-6 col-md-3">
            <q-input v-model="filtros.startDate" label="De" type="date" outlined dense clearable />
          </div>
          <div class="col-6 col-md-3">
            <q-input v-model="filtros.endDate" label="Até" type="date" outlined dense clearable />
          </div>
          <div class="col-12 col-md-3 text-right">
            <q-btn flat color="primary" label="Limpar" @click="resetFilters" class="q-mr-sm" />
            <q-btn color="primary" label="Aplicar filtros" @click="applyFilters" :loading="loading" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Resumo -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-card class="bg-positive text-white">
          <q-card-section>
            <div class="text-subtitle2">Total de entradas</div>
            <div class="text-h5">{{ brl(summary.income) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-negative text-white">
          <q-card-section>
            <div class="text-subtitle2">Total de saídas</div>
            <div class="text-h5">{{ brl(summary.expenses) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-grey-8 text-white">
          <q-card-section>
            <div class="text-subtitle2">Saldo líquido</div>
            <div class="text-h5">{{ brl(summary.balance) }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Tabela -->
    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="transactions"
        :columns="columns"
        row-key="id"
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.type === 'income' ? 'positive' : 'negative'"
              :label="props.row.type === 'income' ? 'Entrada' : 'Saída'"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-amount="props">
          <q-td
            :props="props"
            :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'"
          >
            {{ props.row.type === 'income' ? '+' : '-' }}{{ brl(props.row.amount) }}
          </q-td>
        </template>

        <template v-slot:body-cell-category="props">
          <q-td :props="props">{{ props.row.category || 'Sem categoria' }}</q-td>
        </template>

        <template v-slot:body-cell-date="props">
          <q-td :props="props">
            {{ dataBR(props.row.date) }}
            <div class="text-caption text-grey-7">{{ rotuloMes(props.row.mesRef) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="edit"
              size="sm"
              @click="showTransactionForm(props.row)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="negative"
              icon="delete"
              size="sm"
              @click="confirmDeleteTransaction(props.row)"
            >
              <q-tooltip>Excluir</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Formulário -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 400px" class="rounded-borders">
        <q-form @submit="saveTransaction">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ form.id ? 'Editar' : 'Nova' }} transação</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="q-gutter-y-md">
              <q-radio
                v-model="form.type"
                val="income"
                label="Entrada"
                color="positive"
                class="q-mr-md"
              />
              <q-radio v-model="form.type" val="expense" label="Saída" color="negative" />

              <q-input
                v-model="form.description"
                label="Descrição"
                outlined
                dense
                :rules="[val => !!val || 'A descrição é obrigatória']"
              />

              <q-input
                v-model.number="form.amount"
                type="number"
                label="Valor"
                prefix="R$ "
                outlined
                dense
                :rules="[val => val > 0 || 'O valor deve ser maior que zero']"
              />

              <q-select
                v-model="form.category"
                :options="categoriaOpcoes"
                label="Categoria"
                outlined
                dense
                :rules="[val => !!val || 'A categoria é obrigatória']"
              />

              <q-input
                v-model="form.date"
                label="Data"
                type="date"
                outlined
                dense
                :rules="[val => !!val || 'A data é obrigatória']"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="primary" v-close-popup />
            <q-btn
              type="submit"
              :label="form.id ? 'Salvar' : 'Adicionar'"
              color="primary"
              :loading="saving"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useTransactionStore } from 'src/stores/transactions'
import { useCategoryStore } from 'src/stores/categories'
import { useCardStore } from 'src/stores/cards'
import { filtroVazio } from 'src/services/calc/filters'
import FiltroLancamentos from 'src/components/plan/FiltroLancamentos.vue'
import { brl, dataBR, cents } from 'src/utils/format'
import { monthLabel } from 'src/utils/dates'

const $q = useQuasar()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const cards = useCardStore()

const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const transactions = ref([])

const form = ref({
  id: null,
  type: 'expense',
  description: '',
  amount: null,
  category: 'Fixo',
  date: new Date().toISOString().split('T')[0],
})

const filtros = ref({
  ...filtroVazio(),
  type: null,
  startDate: null,
  endDate: null,
})

const summary = ref({ income: 0, expenses: 0, balance: 0 })

const columns = [
  { name: 'date', required: true, label: 'Data', align: 'left', field: 'date', sortable: true },
  { name: 'description', required: true, label: 'Descrição', align: 'left', field: 'desc', sortable: true },
  { name: 'category', label: 'Categoria', field: 'category', align: 'left', sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center', sortable: true },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'actions', label: 'Ações', field: '', align: 'right', sortable: false },
]

const pagination = ref({
  sortBy: 'date',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

const typeOptions = [
  { label: 'Entrada', value: 'income' },
  { label: 'Saída', value: 'expense' },
]


function rotuloMes(mesRef) {
  return mesRef ? monthLabel(mesRef) : ''
}

function resetFilters() {
  filtros.value = { ...filtroVazio(), type: null, startDate: null, endDate: null }
  applyFilters()
}

async function applyFilters() {
  loading.value = true
  try {
    const lista = await transactionStore.fetchTransactions({
      startDate: filtros.value.startDate,
      endDate: filtros.value.endDate,
      type: filtros.value.type,
      category: filtros.value.categoria || null,
      texto: filtros.value.texto,
      cartaoId: filtros.value.cartaoId || null,
      status: filtros.value.status,
      valorMin: filtros.value.valorMin,
      valorMax: filtros.value.valorMax,
    })
    transactions.value = lista
    pagination.value.rowsNumber = lista.length

    summary.value = {
      income: cents(lista.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)),
      expenses: cents(lista.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)),
      balance: cents(lista.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)),
    }
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message })
  } finally {
    loading.value = false
  }
}

function showTransactionForm(transaction = null) {
  if (transaction) {
    form.value = {
      id: transaction.id,
      type: transaction.type,
      description: transaction.desc,
      amount: transaction.amount,
      category: transaction.category || 'Fixo',
      date: transaction.date,
    }
  } else {
    form.value = {
      id: null,
      type: 'expense',
      description: '',
      amount: null,
      category: 'Fixo',
      date: new Date().toISOString().split('T')[0],
    }
  }
  showForm.value = true
}

async function saveTransaction() {
  saving.value = true
  try {
    const payload = {
      id: form.value.id,
      description: form.value.description,
      amount: form.value.amount,
      type: form.value.type,
      category: form.value.category,
      date: form.value.date,
    }

    if (payload.id) {
      await transactionStore.updateTransaction(payload)
      $q.notify({ color: 'positive', message: 'Transação atualizada.', icon: 'check_circle' })
    } else {
      await transactionStore.createTransaction(payload)
      $q.notify({ color: 'positive', message: 'Transação criada.', icon: 'check_circle' })
    }

    showForm.value = false
    await applyFilters()
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.message || 'Não foi possível salvar a transação',
      icon: 'error',
    })
  } finally {
    saving.value = false
  }
}

function confirmDeleteTransaction(transaction) {
  $q.dialog({
    title: 'Confirmar exclusão',
    message: `Tem certeza que deseja excluir "${transaction.desc}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    deleteTransaction(transaction.id)
  })
}

async function deleteTransaction(id) {
  try {
    await transactionStore.deleteTransaction(id)
    await applyFilters()
    $q.notify({ color: 'positive', message: 'Transação excluída.', icon: 'check_circle' })
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Não foi possível excluir a transação',
      icon: 'error',
    })
  }
}

watch(
  filtros,
  () => {
    applyFilters()
  },
  { deep: true }
)

onMounted(async () => {
  await Promise.all([categoryStore.init(), cards.init(), transactionStore.init()])
  await applyFilters()
})
</script>
