<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-md shadow-2" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">Create Account</div>
        
        <q-form @submit="onSubmit" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input
                v-model="form.firstName"
                label="First Name"
                :rules="[val => !!val || 'First name is required']"
                outlined
                dense
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="form.lastName"
                label="Last Name"
                :rules="[val => !!val || 'Last name is required']"
                outlined
                dense
              />
            </div>
          </div>
          
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
            :rules="[val => !!val || 'Password is required', val => val.length >= 6 || 'Password must be at least 6 characters']"
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
          
          <q-input
            v-model="form.confirmPassword"
            label="Confirm Password"
            :type="showConfirmPassword ? 'text' : 'password'"
            :rules="[val => !!val || 'Please confirm your password', val => val === form.password || 'Passwords do not match']"
            lazy-rules
            outlined
            dense
          >
            <template v-slot:append>
              <q-icon
                :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </q-input>
          
          <q-checkbox
            v-model="form.termsAccepted"
            label="I agree to the Terms of Service and Privacy Policy"
            :rules="[val => !!val || 'You must accept the terms and conditions']"
          />
          
          <div class="q-mt-lg">
            <q-btn
              type="submit"
              color="primary"
              label="Create Account"
              class="full-width"
              :loading="loading"
            />
          </div>
          
          <div class="text-center q-mt-md">
            <span class="text-caption">Already have an account? </span>
            <q-btn
              flat
              color="primary"
              label="Login"
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
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const $q = useQuasar();

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  termsAccepted: false,
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);

const onSubmit = async () => {
  try {
    loading.value = true;
    
    await authStore.register({
      name: `${form.value.firstName} ${form.value.lastName}`,
      email: form.value.email,
      password: form.value.password,
    });
    
    $q.notify({
      color: 'positive',
      message: 'Registration successful! Please log in.',
      icon: 'check_circle',
    });
    
    // Redirect to login or dashboard
    await router.push('/login');
  } catch (error) {
    console.error('Registration error:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Failed to register. Please try again.',
      icon: 'error',
    });
  } finally {
    loading.value = false;
  }
};
</script>
