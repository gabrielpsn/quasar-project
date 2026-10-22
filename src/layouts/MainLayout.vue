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
              <div class="text-h6">{{ user?.nome || 'Usuário' }}</div>
              <div class="text-caption text-grey-8">{{ user?.email || 'Modo local offline' }}</div>
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
      <q-banner
        v-if="storage.needsPermission"
        dense
        class="bg-orange-1 text-orange-10 q-ma-sm rounded-borders"
        inline-actions
      >
        <q-icon name="warning" class="q-mr-xs" />
        Sem acesso à pasta de dados. Reconecte para ler e gravar seus arquivos .txt.
        <template v-slot:action>
          <q-btn
            flat
            dense
            color="orange"
            label="Reconectar"
            @click="reconnect"
          />
        </template>
      </q-banner>

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
import { useStorageStore } from 'src/stores/storage';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const storage = useStorageStore();
const leftDrawerOpen = ref(false);

// Navigation links
const navLinks = [
  { title: 'Dashboard', icon: 'dashboard', to: '/' },
  { title: 'Fluxo de Caixa', icon: 'calendar_month', to: '/fluxo-caixa' },
  { title: 'Transações', icon: 'payments', to: '/transactions' },
  { title: 'Cartões', icon: 'credit_card', to: '/cartoes' },
  { title: 'Dívidas', icon: 'handshake', to: '/dividas' },
  { title: 'Investimentos', icon: 'pie_chart', to: '/investimentos' },
  { title: 'Patrimônio', icon: 'account_balance', to: '/patrimonio' },
  { title: 'Categorias', icon: 'category', to: '/categories' },
  { title: 'Metas', icon: 'flag', to: '/goals' },
  { title: 'Configurações', icon: 'settings', to: '/settings' },
];

// User data
const user = computed(() => authStore.user);
const userInitials = computed(() => authStore.initials);

// Toggle left drawer
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Handle logout
async function onLogout() {
  authStore.logout();
  $q.notify({
    color: 'positive',
    message: 'Sessão bloqueada.',
    icon: 'lock',
  });
  router.push('/login');
}

async function reconnect() {
  try {
    const ok = await storage.requestPermission();
    $q.notify({
      color: ok ? 'positive' : 'warning',
      icon: ok ? 'check_circle' : 'warning',
      message: ok ? 'Acesso aos dados restaurado.' : 'Permissão não concedida.',
    });
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message });
  }
}

// Carrega o perfil local e reage a recarregamentos de dados (import/reset).
onMounted(async () => {
  await authStore.init();
  window.addEventListener('storage:reloaded', () => {
    authStore.init();
  });
});
</script>
