<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-md shadow-2" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">Login</div>
        
        <q-form @submit="onSubmit" class="q-gutter-y-md">
          <q-input
            v-model="form.email"
            label="Email"
            type="email"
            :rules="[val => !!val || 'Email is required', val => /.+@.+\..+/.test(val) || 'Email must be valid']"
            lazy-rules
            outlined
            dense
          />
          
          <q-input
            v-model="form.password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            :rules="[val => !!val || 'Password is required']"
            lazy-rules
            outlined
            dense
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
          
          <div class="text-right">
            <q-btn
              flat
              color="primary"
              label="Forgot Password?"
              no-caps
              size="sm"
              @click="$router.push('/forgot-password')"
            />
          </div>
          
          <div class="q-mt-lg">
            <q-btn
              type="submit"
              color="primary"
              label="Login"
              class="full-width"
              :loading="loading"
            />
          </div>
          
          <div class="text-center q-mt-md">
            <span class="text-caption">Don't have an account? </span>
            <q-btn
              flat
              color="primary"
              label="Register"
              no-caps
              size="sm"
              @click="$router.push('/register')"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const $q = useQuasar();

const form = ref({
  email: '',
  password: '',
});

const showPassword = ref(false);
const loading = ref(false);

const onSubmit = async () => {
  try {
    loading.value = true;
    await authStore.login({
      email: form.value.email,
      password: form.value.password,
    });
    
    $q.notify({
      color: 'positive',
      message: 'Login successful!',
      icon: 'check_circle',
    });
    
    // Redirect to dashboard or intended route
    const redirectTo = router.currentRoute.value.query.redirect || '/';
    await router.push(redirectTo);
  } catch (error) {
    console.error('Login error:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Failed to login. Please check your credentials.',
      icon: 'error',
    });
  } finally {
    loading.value = false;
  }
};
</script>
