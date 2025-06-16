<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Categories</div>
      <q-btn
        color="primary"
        icon="add"
        label="Add Category"
        @click="showCategoryForm()"
      />
    </div>

    <!-- Categories Grid -->
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
                :color="category.color || 'primary'"
                text-color="white"
                :icon="category.icon || 'category'"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ category.name }}
              </q-item-label>
              <q-item-label caption>
                {{ category.type === 'income' ? 'Income' : 'Expense' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="more_vert"
              >
                <q-menu auto-close>
                  <q-list style="min-width: 150px">
                    <q-item clickable @click="showCategoryForm(category)">
                      <q-item-section>Edit</q-item-section>
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                    </q-item>
                    <q-item 
                      clickable 
                      @click="confirmDeleteCategory(category)"
                      :disable="category.is_default"
                    >
                      <q-item-section :class="{ 'text-grey': category.is_default }">
                        Delete
                      </q-item-section>
                      <q-item-section avatar>
                        <q-icon 
                          name="delete" 
                          :class="{ 'text-grey': category.is_default }"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-item-section>
          </q-item>
          
          <q-separator v-if="category.description" />
          
          <q-card-section v-if="category.description" class="q-pt-none">
            <div class="text-caption text-grey-8">
              {{ category.description }}
            </div>
          </q-card-section>
          
          <q-card-actions align="right">
            <q-badge 
              :color="category.type === 'income' ? 'positive' : 'negative'"
              :label="category.type === 'income' ? 'Income' : 'Expense'"
              class="q-mr-sm"
            />
            <q-space />
            <q-badge 
              v-if="category.is_default"
              color="blue"
              label="Default"
              class="q-mr-sm"
            />
            <q-badge 
              v-if="category.transactions_count"
              color="grey-6"
              :label="`${category.transactions_count} transactions`"
            />
          </q-card-actions>
        </q-card>
      </div>
      
      <div v-if="!loading && categories.length === 0" class="col-12 text-center">
        <q-icon name="category" size="4rem" color="grey-4" class="q-mb-sm" />
        <div class="text-h6 text-grey-7">No categories found</div>
        <div class="text-subtitle2 text-grey-6 q-mb-md">
          Start by creating your first category
        </div>
        <q-btn
          color="primary"
          label="Add Category"
          icon="add"
          @click="showCategoryForm()"
        />
      </div>
    </div>

    <!-- Category Form Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 400px">
        <q-form @submit="saveCategory">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ form.id ? 'Edit' : 'Add' }} Category</div>
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
                v-model="form.name"
                label="Name"
                outlined
                dense
                :rules="[val => !!val || 'Name is required']"
              />


              <div class="row q-col-gutter-sm">
                <div class="col-6">
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
                        <q-icon :name="form.icon || 'category'" class="q-mr-sm" />
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
                </div>
                <div class="col-6">
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
                </div>
              </div>

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
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useCategoryStore } from 'src/stores/categories';

const $q = useQuasar();
const categoryStore = useCategoryStore();

// State
const loading = ref(false);
const saving = ref(false);
const showForm = ref(false);
const categories = ref([]);

// Form
const form = ref({
  id: null,
  name: '',
  type: 'expense',
  icon: 'category',
  color: 'primary',
  description: '',
  is_default: false
});

const iconOptions = [
  { label: 'Category', value: 'category' },
  { label: 'Shopping', value: 'shopping_cart' },
  { label: 'Food', value: 'restaurant' },
  { label: 'Transport', value: 'directions_car' },
  { label: 'Home', value: 'home' },
  { label: 'Bill', value: 'receipt' },
  { label: 'Entertainment', value: 'movie' },
  { label: 'Health', value: 'favorite' },
  { label: 'Education', value: 'school' },
  { label: 'Gift', value: 'card_giftcard' },
  { label: 'Salary', value: 'account_balance' },
  { label: 'Investment', value: 'trending_up' },
  { label: 'Other', value: 'more_horiz' }
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

// Methods
const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    type: 'expense',
    icon: 'category',
    color: 'primary',
    description: '',
    is_default: false
  };
};

const showCategoryForm = (category = null) => {
  if (category) {
    // Edit mode
    form.value = { ...category };
  } else {
    // Add mode
    resetForm();
  }
  showForm.value = true;
};

const saveCategory = async () => {
  saving.value = true;
  try {
    const categoryData = { ...form.value };
    
    if (categoryData.id) {
      // Update existing category
      await categoryStore.updateCategory(categoryData);
      $q.notify({
        color: 'positive',
        message: 'Category updated successfully',
        icon: 'check_circle'
      });
    } else {
      // Create new category
      await categoryStore.createCategory(categoryData);
      $q.notify({
        color: 'positive',
        message: 'Category created successfully',
        icon: 'check_circle'
      });
    }
    
    showForm.value = false;
    await loadCategories();
    resetForm();
  } catch (error) {
    console.error('Error saving category:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Failed to save category',
      icon: 'error'
    });
  } finally {
    saving.value = false;
  }
};

const confirmDeleteCategory = (category) => {
  if (category.is_default) {
    $q.notify({
      color: 'negative',
      message: 'Default categories cannot be deleted',
      icon: 'warning'
    });
    return;
  }
  
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete "${category.name}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    deleteCategory(category.id);
  });
};

const deleteCategory = async (id) => {
  try {
    await categoryStore.deleteCategory(id);
    await loadCategories();
    $q.notify({
      color: 'positive',
      message: 'Category deleted successfully',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Failed to delete category',
      icon: 'error'
    });
  }
};

const loadCategories = async () => {
  loading.value = true;
  try {
    await categoryStore.fetchCategories();
    categories.value = categoryStore.categories;
  } catch (error) {
    console.error('Error loading categories:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to load categories',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
/* Add any custom styles here */
</style>
