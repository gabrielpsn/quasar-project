const PublicLayout = () => import('layouts/PublicLayout.vue')

const routes = [
  // Rotas públicas
  {
    path: '/login',
    component: PublicLayout,
    meta: { requiresGuest: true },
    children: [
      { path: '', name: 'login', component: () => import('pages/LoginPage.vue') }
    ]
  },
  {
    path: '/register',
    component: PublicLayout,
    meta: { requiresGuest: true },
    children: [
      { path: '', name: 'register', component: () => import('pages/RegisterPage.vue') }
    ]
  },
  {
    path: '/forgot-password',
    component: PublicLayout,
    meta: { requiresGuest: true },
    children: [
      { path: '', name: 'forgot-password', component: () => import('pages/ForgotPasswordPage.vue') }
    ]
  },

  // Rotas protegidas
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('pages/IndexPage.vue')
      },
      {
        path: '/fluxo-caixa',
        name: 'fluxo-caixa',
        component: () => import('pages/CashFlowPage.vue'),
        meta: { title: 'Fluxo de Caixa' }
      },
      {
        path: '/transactions',
        name: 'transactions',
        component: () => import('pages/TransactionsPage.vue'),
        meta: { title: 'Transações' }
      },
      {
        path: '/cartoes',
        name: 'cartoes',
        component: () => import('pages/CardsPage.vue'),
        meta: { title: 'Cartões' }
      },
      {
        path: '/dividas',
        name: 'dividas',
        component: () => import('pages/DebtsPage.vue'),
        meta: { title: 'Dívidas' }
      },
      {
        path: '/investimentos',
        name: 'investimentos',
        component: () => import('pages/InvestmentsPage.vue'),
        meta: { title: 'Investimentos' }
      },
      {
        path: '/patrimonio',
        name: 'patrimonio',
        component: () => import('pages/NetWorthPage.vue'),
        meta: { title: 'Patrimônio' }
      },
      {
        path: '/categories',
        name: 'categories',
        component: () => import('pages/CategoriesPage.vue'),
        meta: { title: 'Categorias' }
      },
      {
        path: '/goals',
        name: 'goals',
        component: () => import('pages/GoalsPage.vue'),
        meta: { title: 'Metas' }
      },
      {
        path: '/settings',
        name: 'settings',
        component: () => import('pages/SettingsPage.vue'),
        meta: { title: 'Configurações' }
      },
    ]
  },

  // 404 (precisa ser a última)
  {
    path: '/:catchAll(.*)*',
    name: 'not-found',
    component: () => import('pages/ErrorNotFound.vue')
  }
];

export default routes;
