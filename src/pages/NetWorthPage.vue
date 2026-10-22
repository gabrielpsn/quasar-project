<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Patrimônio</div>
        <div class="text-caption text-grey-8">Bens, investimentos e passivos consolidados</div>
      </div>
      <q-btn color="primary" icon="add" label="Novo bem" @click="novoBem" />
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">Bens</div>
            <div class="text-h6 text-positive">{{ brl(networth.totalBens) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">Investimentos</div>
            <div class="text-h6 text-primary">{{ brl(investments.valorAtualTotal) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-caption text-grey-8">Dívidas</div>
            <div class="text-h6 text-negative">- {{ brl(debts.totalDevido) }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Patrimônio líquido</div>
        <div class="text-h4" :class="patrimonio >= 0 ? 'text-positive' : 'text-negative'">
          {{ brl(patrimonio) }}
        </div>
      </q-card-section>
    </q-card>

    <q-table
      flat
      bordered
      row-key="id"
      :rows="networth.ativos"
      :columns="columns"
      :pagination="rowsPerPage"
      class="rounded-borders"
    >
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn dense flat size="sm" icon="edit" color="grey-7" @click="editarBem(props.row)">
            <q-tooltip>Editar</q-tooltip>
          </q-btn>
          <q-btn dense flat size="sm" icon="delete" color="grey-7" @click="removerBem(props.row)">
            <q-tooltip>Excluir</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 340px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editando ? 'Editar bem' : 'Novo bem' }}</div>
          <q-space />
          <q-btn v-close-popup dense flat icon="close" round />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.nome" label="Nome" outlined dense />
          <q-select v-model="form.tipo" :options="tipos" label="Tipo" outlined dense />
          <q-input v-model.number="form.valor" label="Valor atual (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <q-input v-model.number="form.valorAquisicao" label="Valor de aquisição (R$)" type="number" step="0.01" outlined dense>
            <template #prepend>R$</template>
          </q-input>
          <q-input v-model="form.descricao" label="Descrição" outlined dense />
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
import { useNetWorthStore } from 'src/stores/networth'
import { useInvestmentStore } from 'src/stores/investments'
import { useDebtStore } from 'src/stores/debts'
import { brl, cents } from 'src/utils/format'

const $q = useQuasar()
const networth = useNetWorthStore()
const investments = useInvestmentStore()
const debts = useDebtStore()

const dialog = ref(false)
const editando = ref(null)
const rowsPerPage = { rowsPerPage: 0 }

const tipos = ['Imóvel', 'Veículo', 'Equipamento', 'Eletrônico', 'Joia e metais preciosos', 'Investimento', 'Outros']

const form = ref({ nome: '', tipo: 'Imóvel', valor: 0, valorAquisicao: 0, descricao: '' })

const columns = [
  { name: 'nome', label: 'Bem', field: 'nome', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'valor', label: 'Valor atual', field: 'valor', align: 'right', format: (v) => brl(v) },
  { name: 'valorAquisicao', label: 'Aquisição', field: 'valorAquisicao', align: 'right', format: (v) => brl(v) },
  { name: 'acoes', label: '', field: 'acoes', align: 'right' },
]

const patrimonio = computed(() =>
  cents(networth.totalBens + investments.valorAtualTotal - debts.totalDevido)
)

function novoBem() {
  editando.value = null
  form.value = { nome: '', tipo: 'Imóvel', valor: 0, valorAquisicao: 0, descricao: '' }
  dialog.value = true
}

function editarBem(asset) {
  editando.value = asset
  form.value = { ...asset }
  dialog.value = true
}

async function salvar() {
  if (editando.value) {
    await networth.updateAsset({ id: editando.value.id, ...form.value })
  } else {
    await networth.createAsset(form.value)
  }
  dialog.value = false
  $q.notify({ color: 'positive', icon: 'check_circle', message: 'Bem salvo.' })
}

async function removerBem(asset) {
  await networth.removeAsset(asset.id)
  $q.notify({ color: 'positive', icon: 'delete', message: 'Bem removido.' })
}

onMounted(() => Promise.all([networth.init(), investments.init(), debts.init()]))
</script>
