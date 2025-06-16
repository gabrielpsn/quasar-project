<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-md shadow-2" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">Reset Password</div>
        
        <q-form @submit="onSubmit" class="q-gutter-y-md">
          <div class="text-body2 q-mb-md">
            Enter your email address and we'll send you a link to reset your password.
          </div>
          
          <q-input
            v-model="email"
            label="Email"
            type="email"
            :rules="[val => !!val || 'Email is required', val => /.+@.+\..+/.test(val) || 'Email must be valid']"
            lazy-rules
            outlined
            dense
          />
          
          <div class="q-mt-lg">
            <q-btn
              type="submit"
              color="primary"
              label="Send Reset Link"
              class="full-width"
              :loading="loading"
            />
          </div>
          
          <div class="text-center q-mt-md">
            <q-btn
              flat
              color="primary"
              label="Back to Login"
              no-caps
              size="sm"
              @click="$router.push('/login')"
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

const router = useRouter();
const $q = useQuasar();

const email = ref('');
const loading = ref(false);

const onSubmit = async () => {
  try {
    loading.value = true;
    
    // TODO: Implement forgot password API call
    // await api.post('/auth/forgot-password', { email: email.value });
    
    $q.notify({
      color: 'positive',
      message: 'If an account exists with this email, you will receive a password reset link.',
      icon: 'check_circle',
    });
    
    // Redirect to login page
    await router.push('/login');
  } catch (error) {
    console.error('Forgot password error:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Failed to process your request. Please try again.',
      icon: 'error',
    });
  } finally {
    loading.value = false;
  }
};
</script>
