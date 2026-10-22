<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Metas financeiras</div>
      <q-btn
        color="primary"
        icon="add"
        label="Nova meta"
        @click="showGoalForm()"
      />
    </div>

    <!-- Tabs -->
    <q-tabs
      v-model="activeTab"
      class="text-grey-8"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab name="active" label="Ativas" />
      <q-tab name="completed" label="Concluídas" />
      <q-tab name="all" label="Todas" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated>
      <!-- Active Goals -->
      <q-tab-panel name="active" class="q-pa-none">
        <div v-if="loading" class="q-pa-md">
          <q-inner-loading showing color="primary" />
        </div>
        <div v-else-if="activeGoals.length === 0" class="text-center q-pa-lg">
          <q-icon name="emoji_events" size="4rem" color="grey-4" class="q-mb-sm" />
          <div class="text-h6 text-grey-7">Nenhuma meta ativa</div>
          <div class="text-subtitle2 text-grey-6 q-mb-md">
            Comece criando sua primeira meta financeira
          </div>
          <q-btn
            color="primary"
            label="Add Goal"
            icon="add"
            @click="showGoalForm()"
          />
        </div>
        <div v-else class="row q-col-gutter-md q-mt-sm">
          <div 
            v-for="goal in activeGoals" 
            :key="goal.id" 
            class="col-12 col-md-6"
          >
            <goal-card 
              :goal="goal" 
              @edit="showGoalForm(goal)" 
              @delete="confirmDeleteGoal(goal)"
              @update-progress="updateGoalProgress(goal, $event)"
              @toggle-status="toggleGoalStatus(goal)"
            />
          </div>
        </div>
      </q-tab-panel>

      <!-- Completed Goals -->
      <q-tab-panel name="completed" class="q-pa-none">
        <div v-if="loading" class="q-pa-md">
          <q-inner-loading showing color="primary" />
        </div>
        <div v-else-if="completedGoals.length === 0" class="text-center q-pa-lg">
          <q-icon name="emoji_events" size="4rem" color="grey-4" class="q-mb-sm" />
          <div class="text-h6 text-grey-7">Nenhuma meta concluída</div>
          <div class="text-subtitle2 text-grey-6">
            Conclua suas metas para vê-las aqui
          </div>
        </div>
        <div v-else class="row q-col-gutter-md q-mt-sm">
          <div 
            v-for="goal in completedGoals" 
            :key="goal.id" 
            class="col-12 col-md-6"
          >
            <goal-card 
              :goal="goal" 
              @edit="showGoalForm(goal)" 
              @delete="confirmDeleteGoal(goal)"
              @update-progress="updateGoalProgress(goal, $event)"
              @toggle-status="toggleGoalStatus(goal)"
            />
          </div>
        </div>
      </q-tab-panel>

      <!-- All Goals -->
      <q-tab-panel name="all" class="q-pa-none">
        <div v-if="loading" class="q-pa-md">
          <q-inner-loading showing color="primary" />
        </div>
        <div v-else-if="allGoals.length === 0" class="text-center q-pa-lg">
          <q-icon name="emoji_events" size="4rem" color="grey-4" class="q-mb-sm" />
          <div class="text-h6 text-grey-7">Nenhuma meta ainda</div>
          <div class="text-subtitle2 text-grey-6 q-mb-md">
            Comece criando sua primeira meta financeira
          </div>
          <q-btn
            color="primary"
            label="Add Goal"
            icon="add"
            @click="showGoalForm()"
          />
        </div>
        <div v-else class="row q-col-gutter-md q-mt-sm">
          <div 
            v-for="goal in allGoals" 
            :key="goal.id" 
            class="col-12 col-md-6"
          >
            <goal-card 
              :goal="goal" 
              @edit="showGoalForm(goal)" 
              @delete="confirmDeleteGoal(goal)"
              @update-progress="updateGoalProgress(goal, $event)"
              @toggle-status="toggleGoalStatus(goal)"
            />
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Goal Form Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 400px">
        <q-form @submit="saveGoal">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ form.id ? 'Editar' : 'Nova' }} meta</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="q-gutter-y-md">
              <q-input
                v-model="form.name"
                label="Nome da meta"
                outlined
                dense
                :rules="[val => !!val || 'O nome é obrigatório']"
              />

              <q-select
                v-model="form.icon"
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
                    <q-icon :name="form.icon || 'emoji_events'" class="q-mr-sm" />
                    {{ form.icon || 'Selecione um ícone' }}
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

              <q-select
                v-model="form.color"
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
                      :color="form.color || 'grey-6'" 
                      class="q-mr-sm" 
                    />
                    {{ form.color ? form.color.replace('-', ' ') : 'Selecione uma cor' }}
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

              <q-input
                v-model.number="form.target_amount"
                type="number"
                label="Valor da meta"
                prefix="R$ "
                outlined
                dense
                :rules="[val => val > 0 || 'O valor deve ser maior que zero']"
              />

              <q-input
                v-model.number="form.current_amount"
                type="number"
                label="Valor atual"
                prefix="R$ "
                outlined
                dense
                :rules="[val => val >= 0 || 'O valor não pode ser negativo']"
              />

              <q-input
                v-model="form.target_date"
                label="Data limite"
                type="date"
                outlined
                dense
                :rules="[val => !!val || 'A data limite é obrigatória']"
              />

              <q-input
                v-model="form.description"
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
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useGoalStore } from 'src/stores/goals';
import GoalCard from 'src/components/GoalCard.vue';

const $q = useQuasar();
const goalStore = useGoalStore();

// State
const loading = ref(false);
const saving = ref(false);
const showForm = ref(false);
const activeTab = ref('active');

// Form
const form = ref({
  id: null,
  name: '',
  description: '',
  target_amount: 0,
  current_amount: 0,
  target_date: '',
  icon: 'emoji_events',
  color: 'primary',
  achieved: false
});

// Options
const iconOptions = [
  { label: 'Troféu', value: 'emoji_events' },
  { label: 'Cofrinho', value: 'savings' },
  { label: 'Casa', value: 'home' },
  { label: 'Carro', value: 'directions_car' },
  { label: 'Viagem', value: 'flight' },
  { label: 'Educação', value: 'school' },
  { label: 'Saúde', value: 'favorite' },
  { label: 'Presente', value: 'card_giftcard' },
  { label: 'Compras', value: 'shopping_bag' },
  { label: 'Outra', value: 'category' }
];

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
  { label: 'Cinza azulado', value: 'blue-grey' }
];

// Computed
const allGoals = computed(() => {
  return goalStore.goals || [];
});

const activeGoals = computed(() => {
  return allGoals.value.filter(goal => !goal.achieved);
});

const completedGoals = computed(() => {
  return allGoals.value.filter(goal => goal.achieved);
});

// Methods
// Formatting utilities moved to a separate composable

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    description: '',
    target_amount: 0,
    current_amount: 0,
    target_date: '',
    icon: 'emoji_events',
    color: 'primary',
    achieved: false
  };
};

const showGoalForm = (goal = null) => {
  if (goal) {
    // Edit mode
    form.value = { 
      id: goal.id,
      name: goal.name,
      description: goal.description || '',
      target_amount: parseFloat(goal.target_amount),
      current_amount: parseFloat(goal.current_amount),
      target_date: goal.target_date ? String(goal.target_date).split('T')[0] : '',
      icon: goal.icon || 'emoji_events',
      color: goal.color || 'primary',
      achieved: goal.achieved || false
    };
  } else {
    // Add mode
    resetForm();
    // Set default target date to 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    form.value.target_date = oneYearFromNow.toISOString().split('T')[0];
  }
  showForm.value = true;
};

const saveGoal = async () => {
  saving.value = true;
  try {
    const goalData = { ...form.value };
    
    // Ensure current amount doesn't exceed target amount
    if (parseFloat(goalData.current_amount) > parseFloat(goalData.target_amount)) {
      goalData.current_amount = goalData.target_amount;
    }
    
    // Check if goal is achieved
    goalData.achieved = parseFloat(goalData.current_amount) >= parseFloat(goalData.target_amount);
    
    if (goalData.id) {
      // Update existing goal
      await goalStore.updateGoal(goalData);
      $q.notify({
        color: 'positive',
        message: 'Meta atualizada.',
        icon: 'check_circle'
      });
    } else {
      // Create new goal
      await goalStore.createGoal(goalData);
      $q.notify({
        color: 'positive',
        message: 'Meta criada.',
        icon: 'check_circle'
      });
    }
    
    showForm.value = false;
    await loadGoals();
    resetForm();
  } catch (error) {
    console.error('Error saving goal:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Não foi possível salvar a meta',
      icon: 'error'
    });
  } finally {
    saving.value = false;
  }
};

const confirmDeleteGoal = (goal) => {
  $q.dialog({
    title: 'Confirmar exclusão',
    message: `Tem certeza que deseja excluir "${goal.name}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    deleteGoal(goal.id);
  });
};

const deleteGoal = async (id) => {
  try {
    await goalStore.deleteGoal(id);
    $q.notify({
      color: 'positive',
      message: 'Meta excluída.',
      icon: 'check_circle'
    });
    await loadGoals();
  } catch (error) {
    console.error('Error deleting goal:', error);
    $q.notify({
      color: 'negative',
      message: 'Não foi possível excluir a meta',
      icon: 'error'
    });
  }
};

const updateGoalProgress = async (goal, amount) => {
  try {
    await goalStore.updateGoalProgress({
      id: goal.id,
      amount: parseFloat(amount)
    });
    await loadGoals();
    
    $q.notify({
      color: 'positive',
      message: 'Aporte atualizado.',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    $q.notify({
      color: 'negative',
      message: 'Não foi possível atualizar o aporte',
      icon: 'error'
    });
  }
};

const toggleGoalStatus = async (goal) => {
  try {
    await goalStore.toggleGoalStatus(goal.id);
    await loadGoals();
    
    $q.notify({
      color: 'positive',
      message: goal.achieved ? 'Meta marcada como ativa' : 'Meta marcada como concluída',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error toggling goal status:', error);
    $q.notify({
      color: 'negative',
      message: 'Não foi possível atualizar o status da meta',
      icon: 'error'
    });
  }
};

const loadGoals = async () => {
  loading.value = true;
  try {
    await goalStore.fetchGoals();
  } catch (error) {
    console.error('Error loading goals:', error);
    $q.notify({
      color: 'negative',
      message: 'Não foi possível carregar as metas',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  loadGoals();
});
</script>

<style scoped>
.goal-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.q-tab-panel {
  padding: 16px 0 0 0;
}
</style>
