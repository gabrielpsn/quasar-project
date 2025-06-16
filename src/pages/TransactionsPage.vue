<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Transactions</div>
      <q-btn
        color="primary"
        icon="add"
        label="Add Transaction"
        @click="showTransactionForm()"
      />
    </div>

    <!-- Filters -->
    <q-card flat class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-3">
            <q-select
              v-model="filters.type"
              :options="typeOptions"
              label="Type"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="filters.category"
              :options="categoryOptions"
              label="Category"
              outlined
              dense
              emit-value
              map-options
              clearable
              :loading="categoriesLoading"
            >
              <template v-slot:option="{ itemProps, opt, selected }"
                >
                <q-item v-bind="itemProps">
                  <q-item-section avatar>
                    <q-icon :name="opt.icon" :color="opt.color" size="sm" />
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
          <div class="col-12 col-md-3">
            <q-input
              v-model="filters.startDate"
              label="From"
              type="date"
              outlined
              dense
              clearable
            />
          </div>
          <div class="col-12 col-md-3">
            <q-input
              v-model="filters.endDate"
              label="To"
              type="date"
              outlined
              dense
              clearable
            />
          </div>
        </div>
        <div class="row q-mt-sm">
          <div class="col-12 text-right">
            <q-btn
              flat
              color="primary"
              label="Reset Filters"
              @click="resetFilters"
              class="q-mr-sm"
            />
            <q-btn
              color="primary"
              label="Apply Filters"
              @click="applyFilters"
              :loading="loading"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-card class="bg-primary text-white">
          <q-card-section>
            <div class="text-subtitle2">Total Income</div>
            <div class="text-h5">{{ formatCurrency(summary.income) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-negative text-white">
          <q-card-section>
            <div class="text-subtitle2">Total Expenses</div>
            <div class="text-h5">{{ formatCurrency(summary.expenses) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-grey-8 text-white">
          <q-card-section>
            <div class="text-subtitle2">Net Balance</div>
            <div class="text-h5">{{ formatCurrency(summary.balance) }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Transactions Table -->
    <q-card>
      <q-table
        :rows="transactions"
        :columns="columns"
        row-key="id"
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50]"
        @request="onRequest"
      >
        <!-- Type Column -->
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.type === 'income' ? 'positive' : 'negative'"
              :label="props.row.type.charAt(0).toUpperCase() + props.row.type.slice(1)"
            />
          </q-td>
        </template>

        <!-- Amount Column -->
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" :class="{ 'text-positive': props.row.type === 'income', 'text-negative': props.row.type === 'expense' }">
            {{ props.row.type === 'income' ? '+' : '-' }}{{ formatCurrency(props.row.amount) }}
          </q-td>
        </template>

        <!-- Category Column -->
        <template v-slot:body-cell-category="props">
          <q-td :props="props">
            <div class="row items-center">
              <q-avatar
                v-if="props.row.category"
                :color="props.row.category.color || 'primary'"
                text-color="white"
                size="sm"
                class="q-mr-sm"
              >
                <q-icon :name="props.row.category.icon || 'category'" />
              </q-avatar>
              {{ props.row.category?.name || 'Uncategorized' }}
            </div>
          </q-td>
        </template>

        <!-- Date Column -->
        <template v-slot:body-cell-date="props">
          <q-td :props="props">
            {{ formatDate(props.row.date) }}
          </q-td>
        </template>

        <!-- Actions Column -->
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
              <q-tooltip>Edit</q-tooltip>
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
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </q-td>
        </template>

      </q-table>
    </q-card>

    <!-- Transaction Form Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 400px">
        <q-form @submit="saveTransaction">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ form.id ? 'Edit' : 'Add' }} Transaction</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="q-gutter-y-md">
              <q-radio
                v-model="form.type"
                val="income"
                label="Income"
                color="positive"
                class="q-mr-md"
              />
              <q-radio
                v-model="form.type"
                val="expense"
                label="Expense"
                color="negative"
              />

              <q-input
                v-model="form.description"
                label="Description"
                outlined
                dense
                :rules="[val => !!val || 'Description is required']"
              />

              <q-input
                v-model.number="form.amount"
                type="number"
                label="Amount"
                prefix="$"
                outlined
                dense
                :rules="[val => val > 0 || 'Amount must be greater than 0']"
              />

              <q-select
                v-model="form.category_id"
                :options="filteredCategoryOptions"
                label="Category"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                :loading="categoriesLoading"
                :rules="[val => !!val || 'Category is required']"
              >
                <template v-slot:option="{ itemProps, opt, selected }">
                  <q-item v-bind="itemProps">
                    <q-item-section avatar>
                      <q-icon :name="opt.icon" :color="opt.color" size="sm" />
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
                v-model="form.date"
                label="Date"
                type="date"
                outlined
                dense
                :rules="[val => !!val || 'Date is required']"
              />

              <q-input
                v-model="form.notes"
                label="Notes"
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
              :label="form.id ? 'Update' : 'Save'"
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
import { useTransactionStore } from 'src/stores/transactions';
import { useCategoryStore } from 'src/stores/categories';

const $q = useQuasar();
const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();

// State
const loading = ref(false);
const saving = ref(false);
const showForm = ref(false);
const transactions = ref([]);
const categories = ref([]);
const categoriesLoading = ref(false);

// Form
const form = ref({
  id: null,
  type: 'expense',
  description: '',
  amount: null,
  category_id: null,
  date: new Date().toISOString().split('T')[0],
  notes: ''
});

// Filters
const filters = ref({
  type: null,
  category: null,
  startDate: null,
  endDate: null
});

// Summary
const summary = ref({
  income: 0,
  expenses: 0,
  balance: 0
});

// Table columns
const columns = [
  {
    name: 'date',
    required: true,
    label: 'Date',
    align: 'left',
    field: 'date',
    sortable: true
  },
  {
    name: 'description',
    required: true,
    label: 'Description',
    align: 'left',
    field: 'description',
    sortable: true
  },
  {
    name: 'category',
    label: 'Category',
    field: 'category',
    align: 'left',
    sortable: true
  },
  {
    name: 'type',
    label: 'Type',
    field: 'type',
    align: 'center',
    sortable: true
  },
  {
    name: 'amount',
    label: 'Amount',
    field: 'amount',
    align: 'right',
    sortable: true
  },
  {
    name: 'actions',
    label: 'Actions',
    field: '',
    align: 'right',
    sortable: false
  }
];

// Pagination
const pagination = ref({
  sortBy: 'date',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

// Computed
const typeOptions = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' }
];

const categoryOptions = computed(() => {
  return categories.value.map(category => ({
    label: category.name,
    value: category.id,
    color: category.color,
    icon: category.icon,
    type: category.type
  }));
});

const filteredCategoryOptions = computed(() => {
  return categoryOptions.value.filter(cat => cat.type === form.value.type);
});

// Methods
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const resetForm = () => {
  form.value = {
    id: null,
    type: 'expense',
    description: '',
    amount: null,
    category_id: null,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };
};

const showTransactionForm = (transaction = null) => {
  if (transaction) {
    // Edit mode
    form.value = {
      id: transaction.id,
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      category_id: transaction.category_id,
      date: transaction.date.split('T')[0],
      notes: transaction.notes || ''
    };
  } else {
    // Add mode
    resetForm();
  }
  showForm.value = true;
};

const saveTransaction = async () => {
  saving.value = true;
  try {
    const transactionData = { ...form.value };
    
    if (transactionData.id) {
      // Update existing transaction
      await transactionStore.updateTransaction(transactionData);
      $q.notify({
        color: 'positive',
        message: 'Transaction updated successfully',
        icon: 'check_circle'
      });
    } else {
      // Create new transaction
      await transactionStore.createTransaction(transactionData);
      $q.notify({
        color: 'positive',
        message: 'Transaction added successfully',
        icon: 'check_circle'
      });
    }
    
    showForm.value = false;
    await loadTransactions();
    resetForm();
  } catch (error) {
    console.error('Error saving transaction:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Failed to save transaction',
      icon: 'error'
    });
  } finally {
    saving.value = false;
  }
};

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

const deleteTransaction = async (id) => {
  try {
    await transactionStore.deleteTransaction(id);
    $q.notify({
      color: 'positive',
      message: 'Transaction deleted successfully',
      icon: 'check_circle'
    });
    await loadTransactions();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to delete transaction',
      icon: 'error'
    });
  }
};

const resetFilters = () => {
  filters.value = {
    type: null,
    category: null,
    startDate: null,
    endDate: null
  };
  loadTransactions();
};

const applyFilters = () => {
  loadTransactions();
};

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination;
  
  // Update pagination
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;
  
  // Load data with pagination and sorting
  await loadTransactions();
};

const loadTransactions = async () => {
  loading.value = true;
  try {
    // Prepare query params
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      sortBy: pagination.value.sortBy,
      descending: pagination.value.descending ? 'true' : 'false'
    };

    // Add filters
    if (filters.value.type) {
      params.type = filters.value.type;
    }
    if (filters.value.category) {
      params.category_id = filters.value.category;
    }
    if (filters.value.startDate) {
      params.startDate = filters.value.startDate;
    }
    if (filters.value.endDate) {
      params.endDate = filters.value.endDate;
    }

    // Fetch transactions
    const response = await transactionStore.fetchTransactions(params);
    
    // Update transactions and pagination
    transactions.value = response.data || [];
    pagination.value.rowsNumber = response.total || 0;
    
    // Calculate summary
    calculateSummary(transactions.value);
  } catch (error) {
    console.error('Error loading transactions:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to load transactions',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  categoriesLoading.value = true;
  try {
    categories.value = await categoryStore.fetchCategories();
    
    // If no categories exist, initialize default ones
    if (categories.value.length === 0) {
      await categoryStore.initializeDefaultCategories();
      categories.value = await categoryStore.fetchCategories();
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  } finally {
    categoriesLoading.value = false;
  }
};

const calculateSummary = (transactions) => {
  const summaryData = {
    income: 0,
    expenses: 0,
    balance: 0
  };

  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      summaryData.income += parseFloat(transaction.amount);
    } else {
      summaryData.expenses += parseFloat(transaction.amount);
    }
  });

  summaryData.balance = summaryData.income - summaryData.expenses;
  summary.value = summaryData;
};

// Lifecycle hooks
onMounted(async () => {
  await Promise.all([
    loadCategories(),
    loadTransactions()
  ]);
});
</script>

<style scoped>
.q-table__title {
  font-size: 1.25rem;
  font-weight: 500;
}

.q-table__top {
  padding: 16px 16px 0;
}

.q-table__bottom {
  padding: 0 16px 16px;
}

.q-table__card {
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.q-table__top {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.q-table__bottom {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.q-table__title {
  font-size: 1.25rem;
  font-weight: 500;
}

.q-table__top {
  padding: 16px 16px 0;
}

.q-table__bottom {
  padding: 0 16px 16px;
}

.q-table__card {
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.q-table__top {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.q-table__bottom {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
