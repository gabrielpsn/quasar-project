<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="q-mr-sm"
        />

        <q-toolbar-title class="text-weight-bold">
          <q-avatar>
            <img src="icons/favicon-32x32.png">
          </q-avatar>
          Finance App
        </q-toolbar-title>

        <q-space />

        <!-- User Menu -->
        <q-btn-dropdown flat round dense>
          <template v-slot:label>
            <div class="row items-center no-wrap">
              <q-avatar size="32px" class="q-mr-sm">
                <q-icon name="account_circle" size="32px" />
              </q-avatar>
              <div class="text-capitalize">{{ userInitials }}</div>
            </div>
          </template>
          <q-list>
            <q-item clickable v-close-popup>
              <q-item-section avatar>
                <q-icon name="person" />
              </q-item-section>
              <q-item-section>Profile</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="onLogout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Logout</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="250"
      class="bg-grey-2"
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item class="q-pa-md q-mb-sm">
            <q-item-section>
              <div class="text-h6">{{ user?.name || 'User' }}</div>
              <div class="text-caption text-grey-8">{{ user?.email || 'user@example.com' }}</div>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <q-item
            v-for="link in navLinks"
            :key="link.title"
            clickable
            v-ripple
            :to="link.to"
            exact
            active-class="text-primary"
            class="q-my-sm"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>
              {{ link.title }}
            </q-item-section>
            <q-item-section v-if="link.badge" side>
              <q-badge :color="link.badgeColor || 'primary'" :label="link.badge" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition
          enter-active-class="animated fadeIn"
          leave-active-class="animated fadeOut"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const leftDrawerOpen = ref(false);

// Navigation links
const navLinks = [
  { title: 'Dashboard', icon: 'dashboard', to: '/' },
  { title: 'Transactions', icon: 'payments', to: '/transactions' },
  { title: 'Categories', icon: 'category', to: '/categories' },
  { title: 'Goals', icon: 'flag', to: '/goals' },
  { title: 'Reports', icon: 'assessment', to: '/reports' },
  { title: 'Budgets', icon: 'account_balance_wallet', to: '/budgets' },
];

// User data
const user = computed(() => authStore.user);
const userInitials = computed(() => {
  if (!authStore.user?.name) return 'U';
  return authStore.user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
});

// Toggle left drawer
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Handle logout
async function onLogout() {
  try {
    await authStore.logout();
    $q.notify({
      color: 'positive',
      message: 'You have been logged out successfully',
      icon: 'check_circle',
    });
    router.push('/login');
  } catch (error) {
    console.error('Logout error:', error);
    $q.notify({
      color: 'negative',
      message: 'Failed to logout. Please try again.',
      icon: 'error',
    });
  }
}

// Fetch user data on component mount
onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    try {
      await authStore.fetchUser();
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }
});
</script>
