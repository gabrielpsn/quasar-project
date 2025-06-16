<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Balance Summary Card -->
      <div class="col-12 col-md-4">
        <q-card class="bg-primary text-white">
          <q-card-section>
            <div class="text-h6">Total Balance</div>
            <div class="text-h4">{{ formatCurrency(totalBalance) }}</div>
          </q-card-section>
          <q-separator dark />
          <q-card-actions align="around">
            <q-btn flat icon="add" label="Add Income" @click="showAddTransaction('income')" />
            <q-btn flat icon="remove" label="Add Expense" @click="showAddTransaction('expense')" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Income Card -->
      <div class="col-12 col-md-4">
        <q-card class="bg-positive text-white">
          <q-card-section>
            <div class="text-h6">Income (This Month)</div>
            <div class="text-h4">{{ formatCurrency(monthlyIncome) }}</div>
            <q-linear-progress
              :value="0.7"
              stripe
              rounded
              class="q-mt-sm"
              color="white"
              track-color="transparent"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Expenses Card -->
      <div class="col-12 col-md-4">
        <q-card class="bg-negative text-white">
          <q-card-section>
            <div class="text-h6">Expenses (This Month)</div>
            <div class="text-h4">{{ formatCurrency(monthlyExpenses) }}</div>
            <q-linear-progress
              :value="0.5"
              stripe
              rounded
              class="q-mt-sm"
              color="white"
              track-color="transparent"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Recent Transactions -->
      <div class="col-12">
        <q-card>
          <q-card-section class="row items-center">
            <div class="text-h6">Recent Transactions</div>
            <q-space />
            <q-btn
              flat
              round
              dense
              icon="refresh"
              @click="refreshTransactions"
              :loading="loading"
            >
              <q-tooltip>Refresh</q-tooltip>
            </q-btn>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="loading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
            <div class="q-mt-sm">Loading transactions...</div>
          </q-card-section>

          <q-card-section v-else-if="recentTransactions.length === 0" class="text-center q-pa-xl text-grey">
            <q-icon name="receipt" size="3em" />
            <div class="text-h6 q-mt-sm">No transactions yet</div>
            <q-btn
              color="primary"
              label="Add your first transaction"
              class="q-mt-md"
              @click="showAddTransaction('expense')"
            />
          </q-card-section>


          <q-list v-else separator>
            <q-item v-for="transaction in recentTransactions" :key="transaction.id" class="q-py-md">
              <q-item-section avatar>
                <q-avatar
                  :color="transaction.type === 'income' ? 'positive' : 'negative'"
                  text-color="white"
                  :icon="transaction.type === 'income' ? 'south_east' : 'north_east'"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ transaction.description }}</q-item-label>
                <q-item-label caption lines="1">
                  {{ formatDate(transaction.date) }} • {{ transaction.category?.name || 'Uncategorized' }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-item-label :class="{ 'text-positive': transaction.type === 'income', 'text-negative': transaction.type === 'expense' }">
                  {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-btn flat round dense icon="more_vert">
                  <q-menu auto-close>
                    <q-list style="min-width: 150px">
                      <q-item clickable @click="editTransaction(transaction)">
                        <q-item-section>Edit</q-item-section>
                        <q-item-section avatar>
                          <q-icon name="edit" />
                        </q-item-section>
                      </q-item>
                      <q-item clickable @click="confirmDeleteTransaction(transaction)">
                        <q-item-section>Delete</q-item-section>
                        <q-item-section avatar>
                          <q-icon name="delete" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>

          <q-card-actions align="right" v-if="recentTransactions.length > 0">
            <q-btn flat color="primary" label="View All" to="/transactions" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Goals Progress -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Goals Progress</div>
          </q-card-section>
          <q-card-section v-if="goals.length === 0" class="text-center text-grey q-pa-xl">
            <q-icon name="flag" size="3em" />
            <div class="text-h6 q-mt-sm">No goals yet</div>
            <q-btn
              color="primary"
              label="Create your first goal"
              class="q-mt-md"
              to="/goals"
            />
          </q-card-section>
          <q-card-section v-else>
            <q-list>
              <q-item v-for="goal in goals" :key="goal.id" class="q-px-none">
                <q-item-section>
                  <div class="row items-center">
                    <div class="col-12 col-md-4">
                      <div class="text-weight-medium">{{ goal.name }}</div>
                      <div class="text-caption text-grey">
                        {{ formatCurrency(goal.current_amount) }} of {{ formatCurrency(goal.target_amount) }}
                      </div>
                    </div>
                    <div class="col-12 col-md-8">
                      <q-linear-progress
                        :value="goal.progress"
                        stripe
                        rounded
                        :color="getProgressColor(goal.progress)"
                        class="q-mt-sm"
                      >
                        <div class="absolute-full flex flex-center">
                          <q-badge color="white" :label="Math.round(goal.progress * 100) + '%'" />
                        </div>
                      </q-linear-progress>
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="text-right q-mt-md">
              <q-btn flat color="primary" label="View All" to="/goals" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Categories Overview -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Spending by Category</div>
          </q-card-section>
          <q-card-section v-if="categorySpending.length === 0" class="text-center text-grey q-pa-xl">
            <q-icon name="category" size="3em" />
            <div class="text-h6 q-mt-sm">No spending data yet</div>
          </q-card-section>
          <q-card-section v-else>
            <div v-for="category in categorySpending" :key="category.id" class="q-mb-sm">
              <div class="row items-center">
                <div class="col-4">
                  <div class="row items-center">
                    <q-avatar
                      :color="category.color || 'primary'"
                      text-color="white"
                      size="sm"
                      class="q-mr-sm"
                    >
                      <q-icon :name="category.icon || 'category'" />
                    </q-avatar>
                    <span>{{ category.name }}</span>
                  </div>
                </div>
                <div class="col-5">
                  <q-linear-progress
                    :value="category.percentage / 100"
                    :color="category.color || 'primary'"
                    class="q-mx-sm"
                    rounded
                  />
                </div>
                <div class="col-3 text-right">
                  {{ formatCurrency(category.amount) }}
                </div>
              </div>
            </div>
            <div class="text-right q-mt-md">
              <q-btn flat color="primary" label="View All" to="/categories" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTransactionStore } from 'src/stores/transactions';
import { useGoalStore } from 'src/stores/goals';
import { useCategoryStore } from 'src/stores/categories';

const $q = useQuasar();
const transactionStore = useTransactionStore();
const goalStore = useGoalStore();
const categoryStore = useCategoryStore();

// State
const loading = ref(true);
const recentTransactions = ref([]);
const goals = ref([]);
const categorySpending = ref([]);

// Mock data - replace with actual API calls
const totalBalance = ref(12500.75);
const monthlyIncome = ref(3500.50);
const monthlyExpenses = ref(1875.25);

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Get progress color based on percentage
const getProgressColor = (progress) => {
  if (progress >= 1) return 'positive';
  if (progress >= 0.7) return 'warning';
  return 'primary';
};

// Show add transaction dialog
const showAddTransaction = (type) => {
  // This will be implemented with the transaction form component
  console.log('Add transaction:', type);
};

// Edit transaction
const editTransaction = (transaction) => {
  // This will be implemented with the transaction form component
  console.log('Edit transaction:', transaction);
};

// Confirm delete transaction
const confirmDeleteTransaction = (transaction) => {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete "${transaction.description}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    deleteTransaction(transaction.id);
  });
};

// Delete transaction
const deleteTransaction = async (id) => {
  try {
    // Call API to delete transaction
    await transactionStore.deleteTransaction(id);
    $q.notify({
      color: 'positive',
      message: 'Transaction deleted successfully',
      icon: 'check_circle',
    });
    await loadData();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to delete transaction',
      icon: 'error',
    });
  }
};

// Refresh transactions
const refreshTransactions = async () => {
  loading.value = true;
  try {
    await loadData();
    $q.notify({
      color: 'positive',
      message: 'Data refreshed',
      icon: 'refresh',
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
  } finally {
    loading.value = false;
  }
};

// Load dashboard data
const loadData = async () => {
  try {
    // Load recent transactions
    const transactions = await transactionStore.fetchRecentTransactions();
    recentTransactions.value = transactions || [];

    // Load goals
    const goalsData = await goalStore.fetchGoals();
    goals.value = (goalsData || []).map(goal => ({
      ...goal,
      progress: Math.min(goal.current_amount / goal.target_amount, 1)
    }));

    // Load category spending
    const categories = await categoryStore.fetchCategories();
    const spending = await transactionStore.getCategorySpending();
    
    // Calculate total spending for percentages
    const totalSpending = spending.reduce((sum, item) => sum + item.amount, 0);
    
    categorySpending.value = (categories || []).map(category => {
      const categorySpending = spending.find(item => item.category_id === category.id);
      const amount = categorySpending ? categorySpending.amount : 0;
      
      return {
        ...category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      };
    }).sort((a, b) => b.amount - a.amount);
    
    // TODO: Update total balance, monthly income/expenses from API
    // These are currently using mock data
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to load dashboard data',
      icon: 'error',
    });
  } finally {
    loading.value = false;
  }
};

// Initialize component
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.q-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.q-card__section {
  flex: 1 1 auto;
}

.q-linear-progress {
  height: 10px;
}
</style>
