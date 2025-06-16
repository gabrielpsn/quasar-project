<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Financial Goals</div>
      <q-btn
        color="primary"
        icon="add"
        label="Add Goal"
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
      <q-tab name="active" label="Active" />
      <q-tab name="completed" label="Completed" />
      <q-tab name="all" label="All Goals" />
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
          <div class="text-h6 text-grey-7">No active goals</div>
          <div class="text-subtitle2 text-grey-6 q-mb-md">
            Start by creating your first financial goal
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
          <div class="text-h6 text-grey-7">No completed goals yet</div>
          <div class="text-subtitle2 text-grey-6">
            Complete some goals to see them here
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
          <div class="text-h6 text-grey-7">No goals yet</div>
          <div class="text-subtitle2 text-grey-6 q-mb-md">
            Start by creating your first financial goal
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
            <div class="text-h6">{{ form.id ? 'Edit' : 'Add' }} Goal</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="q-gutter-y-md">
              <q-input
                v-model="form.name"
                label="Goal Name"
                outlined
                dense
                :rules="[val => !!val || 'Name is required']"
              />

              <q-select
                v-model="form.icon"
                :options="iconOptions"
                label="Icon"
                outlined
                dense
                emit-value
                map-options
                :rules="[val => !!val || 'Icon is required']"
              >
                <template v-slot:selected>
                  <div class="row items-center">
                    <q-icon :name="form.icon || 'emoji_events'" class="q-mr-sm" />
                    {{ form.icon || 'Select an icon' }}
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
                label="Color"
                outlined
                dense
                emit-value
                map-options
                :rules="[val => !!val || 'Color is required']"
              >
                <template v-slot:selected>
                  <div class="row items-center">
                    <q-icon 
                      name="palette" 
                      :color="form.color || 'grey-6'" 
                      class="q-mr-sm" 
                    />
                    {{ form.color ? form.color.replace('-', ' ') : 'Select a color' }}
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
                label="Target Amount"
                prefix="$"
                outlined
                dense
                :rules="[val => val > 0 || 'Amount must be greater than 0']"
              />

              <q-input
                v-model.number="form.current_amount"
                type="number"
                label="Current Amount"
                prefix="$"
                outlined
                dense
                :rules="[val => val >= 0 || 'Amount cannot be negative']"
              />

              <q-input
                v-model="form.target_date"
                label="Target Date"
                type="date"
                outlined
                dense
                :rules="[val => !!val || 'Target date is required']"
              />

              <q-input
                v-model="form.description"
                label="Description (Optional)"
                type="textarea"
                outlined
                dense
                rows="2"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" v-close-popup />
            <q-btn
              type="submit"
              :label="form.id ? 'Update' : 'Create'"
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
  { label: 'Trophy', value: 'emoji_events' },
  { label: 'Piggy Bank', value: 'savings' },
  { label: 'House', value: 'home' },
  { label: 'Car', value: 'directions_car' },
  { label: 'Plane', value: 'flight' },
  { label: 'Education', value: 'school' },
  { label: 'Health', value: 'favorite' },
  { label: 'Gift', value: 'card_giftcard' },
  { label: 'Shopping', value: 'shopping_bag' },
  { label: 'Other', value: 'category' }
];

const colorOptions = [
  { label: 'Red', value: 'red' },
  { label: 'Pink', value: 'pink' },
  { label: 'Purple', value: 'purple' },
  { label: 'Deep Purple', value: 'deep-purple' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Blue', value: 'blue' },
  { label: 'Light Blue', value: 'light-blue' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Teal', value: 'teal' },
  { label: 'Green', value: 'green' },
  { label: 'Light Green', value: 'light-green' },
  { label: 'Lime', value: 'lime' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Amber', value: 'amber' },
  { label: 'Orange', value: 'orange' },
  { label: 'Deep Orange', value: 'deep-orange' },
  { label: 'Brown', value: 'brown' },
  { label: 'Grey', value: 'grey' },
  { label: 'Blue Grey', value: 'blue-grey' }
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
      target_date: goal.target_date.split('T')[0],
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
        message: 'Goal updated successfully',
        icon: 'check_circle'
      });
    } else {
      // Create new goal
      await goalStore.createGoal(goalData);
      $q.notify({
        color: 'positive',
        message: 'Goal created successfully',
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
      message: error.message || 'Failed to save goal',
      icon: 'error'
    });
  } finally {
    saving.value = false;
  }
};

const confirmDeleteGoal = (goal) => {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete "${goal.name}"?`,
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
      message: 'Goal deleted successfully',
      icon: 'check_circle'
    });
    await loadGoals();
  } catch (error) {
    console.error('Error deleting goal:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to delete goal',
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
      message: 'Progress updated successfully',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to update goal progress',
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
      message: goal.achieved ? 'Goal marked as active' : 'Goal marked as completed',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error toggling goal status:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to update goal status',
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
      message: 'Failed to load goals',
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
