<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="q-pa-md shadow-2" style="min-width: 380px; max-width: 460px; width: 100%">
      <q-card-section class="text-center q-pb-none">
        <q-avatar size="56px" color="primary" text-color="white" icon="account_balance" class="q-mb-sm" />
        <div class="text-h5">Finance App</div>
        <div class="text-caption text-grey-7">
          {{
            isFirstRun
              ? 'Configure seu perfil local — os dados ficam salvos nos seus arquivos .txt'
              : 'Digite sua senha para desbloquear os dados'
          }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-banner v-if="errorMessage" dense class="bg-red-1 text-red-9 q-mb-md" rounded>
          {{ errorMessage }}
        </q-banner>

        <q-form @submit="onSubmit" class="q-gutter-y-md">
          <template v-if="isFirstRun">
            <q-input
              v-model="form.nome"
              label="Seu nome"
              outlined
              dense
              :rules="[(v) => !!v || 'Informe seu nome']"
              lazy-rules
            />
            <q-input v-model="form.email" label="E-mail (opcional)" type="email" outlined dense />
            <q-input
              v-model="form.password"
              label="Senha (opcional)"
              hint="Sem senha o app abre direto. Com senha, os dados são protegidos localmente."
              :type="showPassword ? 'text' : 'password'"
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
          </template>

          <q-input
            v-else
            ref="passwordInput"
            v-model="form.password"
            label="Senha"
            :type="showPassword ? 'text' : 'password'"
            outlined
            dense
            autofocus
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-btn
            type="submit"
            color="primary"
            :label="isFirstRun ? 'Começar' : 'Desbloquear'"
            class="full-width"
            :loading="authStore.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section v-if="isFirstRun" class="q-pt-none">
        <div class="text-caption text-grey-7 text-center">
          <q-icon name="offline_bolt" class="q-mr-xs" />
          Aplicativo 100% offline. Nenhum dado é enviado para servidores.
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const form = ref({ nome: '', email: '', password: '' })
const showPassword = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => route.query.redirect || '/')

const isFirstRun = computed(() => !authStore.needsPassword)

onMounted(async () => {
  await authStore.init()
  if (authStore.isAuthenticated) {
    router.replace(redirectPath.value)
  }
})

async function onSubmit() {
  errorMessage.value = ''
  try {
    if (isFirstRun.value) {
      await authStore.register({
        nome: form.value.nome.trim(),
        email: form.value.email.trim(),
        password: form.value.password || null,
      })
      $q.notify({ color: 'positive', icon: 'check_circle', message: 'Perfil criado com sucesso.' })
    } else {
      await authStore.login(form.value.password)
    }
    router.replace(redirectPath.value)
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível continuar.'
  }
}
</script>
