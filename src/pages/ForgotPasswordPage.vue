<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="q-pa-md shadow-2" style="min-width: 380px; max-width: 520px; width: 100%">
      <q-card-section class="text-center q-pb-none">
        <q-avatar size="56px" color="orange" text-color="white" icon="lock_reset" class="q-mb-sm" />
        <div class="text-h5">Esqueci a senha</div>
      </q-card-section>

      <q-card-section>
        <div class="text-body2 text-grey-8 q-mb-md">
          Como o aplicativo funciona <strong>100% offline</strong>, não existe servidor para
          recuperar a senha. Seus dados estão em arquivos <code>.txt</code> no seu computador.
        </div>

        <q-list dense class="q-mb-md">
          <q-item>
            <q-item-section avatar><q-icon name="folder" /></q-item-section>
            <q-item-section>
              <q-item-label>Opção 1 — editar o arquivo</q-item-label>
              <q-item-label caption>
                Abra <code>perfil.txt</code> e remova as linhas <code>senhaHash</code> e
                <code>salt</code>. Ao abrir o app novamente, o perfil será liberado.
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar><q-icon name="restore" /></q-item-section>
            <q-item-section>
              <q-item-label>Opção 2 — restaurar um backup</q-item-label>
              <q-item-label caption>
                Importe um bundle <code>.txt</code> exportado antes da perda da senha em
                <strong>Configurações → Backup</strong>.
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-banner v-if="!storage.supportsDirectoryPicker" dense class="bg-blue-1 text-blue-9" rounded>
          <span v-if="storage.mode === 'opfs'">
            Seus dados estão no armazenamento privado do navegador (OPFS). Eles são apagados junto
            com os dados do navegador — exporte um backup com frequência.
          </span>
          <span v-else>
            Use o botão abaixo para limpar o perfil local e recomeçar.
          </span>
        </q-banner>

        <q-btn
          outline
          color="negative"
          icon="delete_forever"
          label="Apagar perfil local e recomeçar"
          class="full-width"
          :loading="storage.busy"
          @click="confirmReset"
        />
      </q-card-section>

      <q-card-actions align="center">
        <q-btn flat color="primary" label="Voltar" @click="$router.push('/login')" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { useStorageStore } from 'src/stores/storage'
import { profileRepo } from 'src/services/repositories'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const storage = useStorageStore()

async function confirmReset() {
  const confirmed = await new Promise((resolve) => {
    $q.dialog({
      title: 'Apagar o perfil local?',
      message:
        'A senha e os dados de perfil serão removidos. Os demais arquivos de dados (.txt) são mantidos.',
      cancel: true,
      persistent: true,
      ok: { label: 'Apagar perfil', color: 'negative' },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })

  if (!confirmed) return

  try {
    const profile = await profileRepo.load()
    profile.senhaHash = null
    profile.salt = null
    await profileRepo.saveNow(profile)
    $q.notify({ color: 'positive', icon: 'check_circle', message: 'Perfil desbloqueado.' })
    authStore.needsPassword = false
    authStore.isAuthenticated = true
    router.replace('/')
  } catch (error) {
    $q.notify({ color: 'negative', icon: 'error', message: error.message })
  }
}
</script>
