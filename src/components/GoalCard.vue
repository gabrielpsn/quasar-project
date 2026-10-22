<template>
  <q-card class="goal-card" :class="{ 'goal-card--completed': goal.achieved }">
    <q-card-section>
      <div class="row items-center no-wrap">
        <q-avatar 
          :color="goal.color || 'primary'" 
          text-color="white"
          :icon="goal.icon || 'emoji_events'"
          size="lg"
          class="q-mr-sm"
        />
        
        <div class="col">
          <div class="text-h6 text-weight-medium ellipsis">
            {{ goal.name }}
          </div>
          <div v-if="goal.description" class="text-caption text-grey-7 ellipsis-2-lines">
            {{ goal.description }}
          </div>
        </div>
        
        <q-btn
          flat
          round
          dense
          icon="more_vert"
          class="q-ml-sm"
        >
          <q-menu auto-close>
            <q-list style="min-width: 150px">
              <q-item clickable @click="$emit('edit', goal)">
                <q-item-section>Editar</q-item-section>
                <q-item-section avatar>
                  <q-icon name="edit" />
                </q-item-section>
              </q-item>
              <q-item 
                v-if="!goal.achieved"
                clickable 
                @click="markAsComplete"
              >
                <q-item-section>Marcar como concluída</q-item-section>
                <q-item-section avatar>
                  <q-icon name="check_circle" />
                </q-item-section>
              </q-item>
              <q-item 
                v-else
                clickable 
                @click="markAsIncomplete"
              >
                <q-item-section>Marcar como não concluída</q-item-section>
                <q-item-section avatar>
                  <q-icon name="refresh" />
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item 
                clickable 
                @click="$emit('delete', goal)"
                class="text-negative"
              >
                <q-item-section>Excluir</q-item-section>
                <q-item-section avatar>
                  <q-icon name="delete" color="negative" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
      
      <div class="q-mt-md">
        <div class="row justify-between items-center q-mb-xs">
          <div class="text-caption text-weight-medium">
            Progresso ({{ progressPercentage }}%)
          </div>
          <div class="text-caption">
            {{ formattedCurrentAmount }} de {{ formattedTargetAmount }}
          </div>
        </div>
        <q-linear-progress
          :value="progressValue"
          :color="progressColor"
          size="10px"
          class="q-mb-sm"
          rounded
        />
      </div>
      
      <div class="row justify-between items-center q-mt-md">
        <div class="text-caption">
          <q-icon name="event" size="xs" class="q-mr-xs" />
          {{ formattedTargetDate }}
          <q-tooltip>Data limite</q-tooltip>
        </div>
        
        <q-badge 
          :color="statusColor"
          :label="statusText"
          class="text-weight-medium"
        />
      </div>
    </q-card-section>
    
    <q-separator v-if="!goal.achieved" />
    
    <q-card-actions v-if="!goal.achieved" align="right">
      <q-btn 
        flat 
        color="primary" 
        label="Adicionar aporte" 
        icon="add"
        size="sm"
        @click="showAddProgressDialog = true"
      />
    </q-card-actions>
    
    <!-- Add Progress Dialog -->
    <q-dialog v-model="showAddProgressDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Adicionar aporte em "{{ goal.name }}"</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            ref="amountInput"
            v-model.number="progressAmount"
            type="number"
            label="Valor a adicionar"
            prefix="R$ "
            outlined
            dense
            :rules="[val => val > 0 || 'O valor deve ser maior que zero']"
            @keyup.enter="addProgress"
          />
          
          <div class="q-mt-sm text-caption text-grey-7">
            Atual: {{ formattedCurrentAmount }} | 
            Alvo: {{ formattedTargetAmount }} | 
            Falta: {{ formattedRemainingAmount }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn 
            label="Adicionar" 
            color="primary" 
            @click="addProgress"
            :loading="addingProgress"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { brl, dataBR } from 'src/utils/format';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit', 'delete', 'update-progress', 'toggle-status']);

const $q = useQuasar();

// State
const showAddProgressDialog = ref(false);
const progressAmount = ref(0);
const addingProgress = ref(false);

// Computed
const progressValue = computed(() => {
  return Math.min(props.goal.current_amount / props.goal.target_amount, 1);
});

const progressPercentage = computed(() => {
  return Math.min(Math.round((props.goal.current_amount / props.goal.target_amount) * 100), 100);
});

const progressColor = computed(() => {
  if (props.goal.achieved) return 'positive';
  
  const percentage = progressPercentage.value;
  if (percentage >= 75) return 'light-green-6';
  if (percentage >= 50) return 'yellow-8';
  if (percentage >= 25) return 'orange';
  return 'negative';
});

const statusText = computed(() => {
  if (props.goal.achieved) return 'Concluída';
  
  const today = new Date();
  const targetDate = new Date(props.goal.target_date);
  const daysRemaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) return 'Atrasada';
  if (daysRemaining === 0) return 'Vence hoje';
  if (daysRemaining === 1) return 'Vence amanhã';
  if (daysRemaining <= 7) return `Vence em ${daysRemaining} dias`;
  return 'Em dia';
});

const statusColor = computed(() => {
  if (props.goal.achieved) return 'positive';
  
  const status = statusText.value;
  if (status === 'Atrasada') return 'negative';
  if (status === 'Vence hoje' || status === 'Vence amanhã' || status.includes('dias')) return 'orange';
  return 'primary';
});

const formattedCurrentAmount = computed(() => {
  return formatCurrency(props.goal.current_amount);
});

const formattedTargetAmount = computed(() => {
  return formatCurrency(props.goal.target_amount);
});

const formattedRemainingAmount = computed(() => {
  const remaining = Math.max(0, props.goal.target_amount - props.goal.current_amount);
  return formatCurrency(remaining);
});

const formattedTargetDate = computed(() => {
  if (!props.goal.target_date) return '';
  return dataBR(props.goal.target_date, { month: 'short' });
});

// Methods
const formatCurrency = (value) => brl(value);

const addProgress = async () => {
  if (!progressAmount.value || progressAmount.value <= 0) {
    $q.notify({
      color: 'warning',
      message: 'Informe um valor válido',
      icon: 'warning'
    });
    return;
  }

  addingProgress.value = true;
  try {
    emit('update-progress', parseFloat(progressAmount.value));
    showAddProgressDialog.value = false;
    progressAmount.value = 0;
    
    $q.notify({
      color: 'positive',
      message: 'Aporte registrado.',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error adding progress:', error);
    $q.notify({
      color: 'negative',
      message: 'Não foi possível registrar o aporte',
      icon: 'error'
    });
  } finally {
    addingProgress.value = false;
  }
};

const markAsComplete = () => {
  emit('toggle-status');
};

const markAsIncomplete = () => {
  emit('toggle-status');
};

// Watch for dialog open/close
watch(showAddProgressDialog, (newVal) => {
  if (newVal) {
    // Reset progress amount when dialog opens
    progressAmount.value = 0;
    // Focus the input field
    setTimeout(() => {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      setTimeout(() => {
        const input = document.querySelector('.q-dialog input');
        if (input) {
          input.focus();
        }
      }, 100);
    }, 100);
  }
});
</script>

<style scoped>
.goal-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.goal-card--completed {
  opacity: 0.8;
  background-color: rgba(0, 0, 0, 0.02);
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
