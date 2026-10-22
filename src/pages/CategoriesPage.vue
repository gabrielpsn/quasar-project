<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Categorias</div>
      <q-btn
        color="primary"
        icon="add"
        label="Nova categoria"
        @click="showCategoryForm()"
      />
    </div>

    <!-- Categorias -->
    <div v-if="loading" class="row q-col-gutter-md">
      <div v-for="i in 6" :key="i" class="col-12 col-sm-6 col-md-4">
        <q-card>
          <q-item>
            <q-item-section avatar>
              <q-skeleton type="QAvatar" />
            </q-item-section>
            <q-item-section>
              <q-item-label>
                <q-skeleton type="text" width="120px" />
              </q-item-label>
              <q-item-label caption>
                <q-skeleton type="text" width="80px" />
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-card>
      </div>
    </div>

    <div v-else class="row q-col-gutter-md">
      <div
        v-for="category in categories"
        :key="category.id"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card>
          <q-item>
            <q-item-section avatar>
              <q-avatar
                :color="category.cor || 'primary'"
                text-color="white"
                :icon="category.icone || 'category'"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ category.nome }}
              </q-item-label>
              <q-item-label caption>
                {{ category.tipo === 'entrada' ? 'Entrada' : 'Saída' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round dense icon="more_vert">
                <q-menu auto-close>
                  <q-list style="min-width: 150px">
                    <q-item clickable @click="showCategoryForm(category)">
                      <q-item-section>Editar</q-item-section>
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                    </q-item>
                    <q-item clickable @click="confirmDeleteCategory(category)">
                      <q-item-section class="text-negative">Excluir</q-item-section>
                      <q-item-section avatar>
                        <q-icon name="delete" color="negative" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-item-section>
          </q-item>

          <q-separator v-if="category.descricao" />

          <q-card-section v-if="category.descricao" class="q-pt-none">
            <div class="text-caption text-grey-8">
              {{ category.descricao }}
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-badge
              :color="category.tipo === 'entrada' ? 'positive' : 'negative'"
              :label="category.tipo === 'entrada' ? 'Entrada' : 'Saída'"
              class="q-mr-sm"
            />
            <q-space />
            <q-badge
              v-if="category.padrao"
              color="blue"
              label="Padrão"
              class="q-mr-sm"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div v-if="!loading && categories.length === 0" class="col-12 text-center">
        <q-icon name="category" size="4rem" color="grey-4" class="q-mb-sm" />
        <div class="text-h6 text-grey-7">Nenhuma categoria encontrada</div>
        <div class="text-subtitle2 text-grey-6 q-mb-md">
          Comece criando sua primeira categoria
        </div>
        <q-btn color="primary" label="Nova categoria" icon="add" @click="showCategoryForm()" />
      </div>
    </div>

    <!-- Formulário -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 400px" class="rounded-borders">
        <q-form @submit="saveCategory">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ form.id ? 'Editar' : 'Nova' }} categoria</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="q-gutter-y-md">
              <q-radio
                v-model="form.tipo"
                val="saida"
                label="Saída"
                color="negative"
                class="q-mr-md"
              />
              <q-radio
                v-model="form.tipo"
                val="entrada"
                label="Entrada"
                color="positive"
              />

              <q-input
                v-model="form.nome"
                label="Nome"
                outlined
                dense
                :rules="[val => !!val || 'O nome é obrigatório']"
              />

              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <q-select
                    v-model="form.icone"
                    :options="iconOptions"
                    label="Ícone"
                    outlined
                    dense
                    emit-value
                    map-options
                    :rules="[val => !!val || 'O ícone é obrigatório']"
                  >
                    <template v-slot:selected>
                      <div class="row items-center">
                        <q-icon :name="form.icone || 'category'" class="q-mr-sm" />
                        {{ form.icone || 'Selecione um ícone' }}
                      </div>
                    </template>
                    <template v-slot:option="{ itemProps, opt, selected }">
                      <q-item v-bind="itemProps">
                        <q-item-section avatar>
                          <q-icon :name="opt.value" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ opt.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side v-if="selected">
                          <q-icon name="check" color="primary" />
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
                <div class="col-6">
                  <q-select
                    v-model="form.cor"
                    :options="colorOptions"
                    label="Cor"
                    outlined
                    dense
                    emit-value
                    map-options
                    :rules="[val => !!val || 'A cor é obrigatória']"
                  >
                    <template v-slot:selected>
                      <div class="row items-center">
                        <q-icon
                          name="palette"
                          :color="form.cor || 'grey-6'"
                          class="q-mr-sm"
                        />
                        {{ form.cor ? form.cor.replace('-', ' ') : 'Selecione uma cor' }}
                      </div>
                    </template>
                    <template v-slot:option="{ itemProps, opt, selected }">
                      <q-item v-bind="itemProps">
                        <q-item-section avatar>
                          <q-icon name="palette" :color="opt.value" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ opt.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side v-if="selected">
                          <q-icon name="check" color="primary" />
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
              </div>

              <q-input
                v-model="form.descricao"
                label="Descrição (opcional)"
                type="textarea"
                outlined
                dense
                rows="2"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="primary" v-close-popup />
            <q-btn
              type="submit"
              :label="form.id ? 'Salvar' : 'Criar'"
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
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useCategoryStore } from 'src/stores/categories'

const $q = useQuasar()
const categoryStore = useCategoryStore()

const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const categories = ref([])

const form = ref({
  id: null,
  nome: '',
  tipo: 'saida',
  icone: 'category',
  cor: 'primary',
  descricao: '',
  padrao: false,
})

const iconOptions = [
  { label: 'Categoria', value: 'category' },
  { label: 'Compras', value: 'shopping_cart' },
  { label: 'Alimentação', value: 'restaurant' },
  { label: 'Transporte', value: 'directions_car' },
  { label: 'Casa', value: 'home' },
  { label: 'Conta', value: 'receipt' },
  { label: 'Lazer', value: 'movie' },
  { label: 'Saúde', value: 'favorite' },
  { label: 'Educação', value: 'school' },
  { label: 'Presente', value: 'card_giftcard' },
  { label: 'Salário', value: 'account_balance' },
  { label: 'Investimento', value: 'trending_up' },
  { label: 'Outro', value: 'more_horiz' },
]

const colorOptions = [
  { label: 'Vermelho', value: 'red' },
  { label: 'Rosa', value: 'pink' },
  { label: 'Roxo', value: 'purple' },
  { label: 'Roxo escuro', value: 'deep-purple' },
  { label: 'Índigo', value: 'indigo' },
  { label: 'Azul', value: 'blue' },
  { label: 'Azul claro', value: 'light-blue' },
  { label: 'Ciano', value: 'cyan' },
  { label: 'Verde-azulado', value: 'teal' },
  { label: 'Verde', value: 'green' },
  { label: 'Verde claro', value: 'light-green' },
  { label: 'Lima', value: 'lime' },
  { label: 'Amarelo', value: 'yellow' },
  { label: 'Âmbar', value: 'amber' },
  { label: 'Laranja', value: 'orange' },
  { label: 'Laranja escuro', value: 'deep-orange' },
  { label: 'Marrom', value: 'brown' },
  { label: 'Cinza', value: 'grey' },
  { label: 'Cinza azulado', value: 'blue-grey' },
]

function resetForm() {
  form.value = {
    id: null,
    nome: '',
    tipo: 'saida',
    icone: 'category',
    cor: 'primary',
    descricao: '',
    padrao: false,
  }
}

function showCategoryForm(category = null) {
  if (category) {
    form.value = { ...category }
  } else {
    resetForm()
  }
  showForm.value = true
}

async function saveCategory() {
  saving.value = true
  try {
    const payload = {
      id: form.value.id,
      nome: form.value.nome,
      tipo: form.value.tipo,
      icone: form.value.icone,
      cor: form.value.cor,
      descricao: form.value.descricao,
      padrao: form.value.padrao,
    }

    if (payload.id) {
      await categoryStore.updateCategory(payload)
      $q.notify({ color: 'positive', message: 'Categoria atualizada.', icon: 'check_circle' })
    } else {
      await categoryStore.createCategory(payload)
      $q.notify({ color: 'positive', message: 'Categoria criada.', icon: 'check_circle' })
    }

    showForm.value = false
    await loadCategories()
    resetForm()
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.message || 'Não foi possível salvar a categoria',
      icon: 'error',
    })
  } finally {
    saving.value = false
  }
}

function confirmDeleteCategory(category) {
  $q.dialog({
    title: 'Confirmar exclusão',
    message: `Tem certeza que deseja excluir "${category.nome}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    deleteCategory(category.id)
  })
}

async function deleteCategory(id) {
  try {
    await categoryStore.deleteCategory(id)
    await loadCategories()
    $q.notify({ color: 'positive', message: 'Categoria excluída.', icon: 'check_circle' })
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Não foi possível excluir a categoria',
      icon: 'error',
    })
  }
}

async function loadCategories() {
  loading.value = true
  try {
    await categoryStore.fetchCategories()
    categories.value = categoryStore.categories
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Não foi possível carregar as categorias',
      icon: 'error',
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
})
</script>
