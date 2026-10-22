<template>
  <div class="row q-col-gutter-sm items-center">
    <div class="col-12 col-md">
      <q-input
        :model-value="modelValue.texto"
        label="Buscar por descrição ou categoria"
        outlined
        dense
        clearable
        debounce="200"
        @update:model-value="atualizar('texto', $event)"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <div class="col-6 col-md-2">
      <q-select
        :model-value="modelValue.categoria"
        :options="opcoesCategoria"
        label="Categoria"
        outlined
        dense
        emit-value
        map-options
        clearable
        @update:model-value="atualizar('categoria', $event)"
      />
    </div>

    <div v-if="mostrarCartao" class="col-6 col-md-2">
      <q-select
        :model-value="modelValue.cartaoId"
        :options="opcoesCartao"
        label="Cartão"
        outlined
        dense
        emit-value
        map-options
        clearable
        @update:model-value="atualizar('cartaoId', $event)"
      />
    </div>

    <div class="col-6 col-md-2">
      <q-select
        :model-value="modelValue.status"
        :options="opcoesStatus"
        label="Status"
        outlined
        dense
        emit-value
        map-options
        @update:model-value="atualizar('status', $event)"
      />
    </div>

    <div class="col-6 col-md-3 col-lg-2">
      <div class="row q-col-gutter-xs">
        <div class="col">
          <q-input
            :model-value="modelValue.valorMin"
            label="Valor mín."
            type="number"
            step="0.01"
            min="0"
            outlined
            dense
            @update:model-value="atualizar('valorMin', $event)"
          />
        </div>
        <div class="col">
          <q-input
            :model-value="modelValue.valorMax"
            label="Valor máx."
            type="number"
            step="0.01"
            min="0"
            outlined
            dense
            @update:model-value="atualizar('valorMax', $event)"
          />
        </div>
      </div>
    </div>

    <div class="col-auto">
      <q-btn
        v-if="ativo"
        flat
        dense
        color="primary"
        icon="filter_alt_off"
        label="Limpar"
        @click="$emit('limpar')"
      >
        <q-tooltip>Limpar filtros</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { categoriasDisponiveis, filtroAtivo } from 'src/services/calc/filters'

const props = defineProps({
  modelValue: { type: Object, required: true },
  itens: { type: Array, default: () => [] },
  cartoes: { type: Array, default: () => [] },
  mostrarCartao: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'limpar'])

const ativo = computed(() => filtroAtivo(props.modelValue))

const opcoesCategoria = computed(() =>
  categoriasDisponiveis(props.itens).map((c) => ({ label: c, value: c }))
)

const opcoesCartao = computed(() =>
  props.cartoes.map((c) => ({ label: c.nome, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
)

const opcoesStatus = [
  { label: 'Todos', value: 'todos' },
  { label: 'Pendentes', value: 'pendentes' },
  { label: 'Pagos', value: 'pagos' },
]

function atualizar(campo, valor) {
  emit('update:modelValue', { ...props.modelValue, [campo]: valor })
}
</script>
