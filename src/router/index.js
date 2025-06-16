import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // Navigation guards
  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Set the router instance in the auth store
    authStore.setRouter(Router)
    
    // Check if the route requires authentication
    if (to.matched.some(record => record.meta.requiresAuth)) {
      // Check if user is not authenticated
      if (!authStore.isAuthenticated) {
        // Redirect to login page with the return url
        return next({
          name: 'login',
          query: { redirect: to.fullPath }
        })
      }
      
      // If user is authenticated but hasn't loaded their data yet
      if (!authStore.user) {
        try {
          await authStore.fetchUser()
        } catch (error) {
          console.error('Failed to fetch user:', error)
          // If fetching user fails, log them out
          authStore.logout()
          return next({ name: 'login' })
        }
      }
      
      return next()
    }
    
    // Check if the route is only for guests
    if (to.matched.some(record => record.meta.requiresGuest)) {
      // If user is authenticated, redirect to home
      if (authStore.isAuthenticated) {
        return next({ name: 'dashboard' })
      }
      return next()
    }
    
    // For all other routes, continue
    next()
  })

  return Router
})
