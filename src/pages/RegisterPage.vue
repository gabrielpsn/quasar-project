<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="q-pa-md shadow-2" style="min-width: 380px; max-width: 460px; width: 100%">
      <q-card-section class="text-center q-pb-none">
        <q-avatar size="56px" color="primary" text-color="white" icon="person_add" class="q-mb-sm" />
        <div class="text-h5">Criar perfil local</div>
        <div class="text-caption text-grey-7">
          Tudo fica no seu dispositivo — não existe servidor, cadastro remoto nem e-mail enviado.
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-y-md">
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
            hint="Protege o acesso aos arquivos .txt neste dispositivo."
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

          <q-btn
            type="submit"
            color="primary"
            label="Criar perfil"
            class="full-width"
            :loading="authStore.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="center">
        <q-btn flat color="primary" label="Já tenho perfil" @click="$router.push('/login')" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const form = ref({ nome: '', email: '', password: '' })
const showPassword = ref(false)

async function onSubmit() {
  try {
    await authStore.register({
      nome: form.value.nome.trim(),
      email: form.value.email.trim(),
      password: form.value.password || null,
    })
    $q.notify({ color: 'positive', icon: 'check_circle', message: 'Perfil criado.' })
    router.replace('/')
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message })
  }
}
</script>
