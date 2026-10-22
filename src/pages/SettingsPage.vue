<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-lg-7">
        <!-- Status do armazenamento -->
        <q-card class="q-mb-md">
          <q-card-section class="row items-center q-gutter-sm">
            <q-icon :name="storage.modeIcon" size="32px" :color="statusColor" />
            <div class="col">
              <div class="text-h6">{{ storage.modeLabel }}</div>
              <div class="text-caption text-grey-7">{{ storage.label }}</div>
            </div>
            <q-space />
            <q-badge
              :color="statusColor"
              :label="storage.ready ? 'Pronto' : 'Aguardando permissão'"
              class="q-pa-sm"
            />
          </q-card-section>

          <q-separator />

          <q-card-section class="q-gutter-y-md">
            <div v-if="storage.needsPermission" class="bg-orange-1 text-orange-9 q-pa-md rounded-borders">
              <div class="text-subtitle2">
                <q-icon name="warning" class="q-mr-xs" />
                Reconecte a pasta de dados
              </div>
              <div class="text-caption">
                O navegador perdeu a permissão de leitura e escrita na pasta
                <strong>{{ storage.directoryName || 'de dados' }}</strong>. Clique abaixo para
                autorizar novamente — sem isso os dados não podem ser lidos nem gravados.
              </div>
              <q-btn
                class="q-mt-sm"
                color="orange"
                icon="link"
                label="Reconectar pasta"
                :loading="storage.busy"
                @click="reconnect"
              />
            </div>

            <q-list dense>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="folder" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Local dos arquivos</q-item-label>
                  <q-item-label caption>{{ storage.directoryName || '—' }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="schedule" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Última gravação</q-item-label>
                  <q-item-label caption>{{ lastSaved }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="description" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Arquivos .txt</q-item-label>
                  <q-item-label caption>{{ storage.fileList.length }} arquivo(s) gravados</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <div class="row q-gutter-sm">
              <q-btn
                v-if="storage.supportsDirectoryPicker"
                color="primary"
                icon="folder_open"
                label="Escolher pasta de dados"
                :loading="storage.busy"
                @click="pickLocation"
              />
              <q-btn
                outline
                color="primary"
                icon="save"
                label="Gravar agora"
                :loading="storage.busy"
                @click="saveNow"
              />
            </div>

            <div class="text-caption text-grey-7">
              {{ storage.description }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Backup -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">
              <q-icon name="backup" class="q-mr-sm" />
              Backup e restauração
            </div>
            <div class="text-caption text-grey-7">
              Todos os dados são gravados em arquivos <code>.txt</code> legíveis. Faça o download
              de um bundle único para guardar ou levar para outro computador.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="left" class="q-gutter-sm q-pa-md">
            <q-btn
              color="primary"
              icon="cloud_download"
              label="Baixar backup (.txt)"
              :loading="storage.busy"
              @click="exportBundle"
            />
            <q-btn
              outline
              color="primary"
              icon="publish"
              label="Importar backup"
              :loading="storage.busy"
              @click="pickImport"
            />
            <q-btn
              outline
              color="primary"
              icon="move_up"
              label="Importar do Gemini v22"
              @click="dialogGemini = true"
            />
            <q-btn
              outline
              color="negative"
              icon="delete"
              label="Apagar todos os dados"
              :loading="storage.busy"
              @click="confirmReset"
            />
          </q-card-actions>
        </q-card>

        <!-- Fundo de reserva -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">
              <q-icon name="savings" class="q-mr-sm" />
              Fundo de reserva
            </div>
            <div class="text-caption text-grey-7">
              Reserva de emergência para cobrir as despesas médias mensais.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-gutter-y-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="reservaForm.valorAtual"
                  label="Valor reservado (R$)"
                  type="number"
                  step="100"
                  min="0"
                  outlined
                  dense
                >
                  <template #prepend>R$</template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="reservaForm.aporteMensal"
                  label="Aporte mensal (R$)"
                  type="number"
                  step="50"
                  min="0"
                  outlined
                  dense
                >
                  <template #prepend>R$</template>
                </q-input>
              </div>
            </div>
            <q-input
              v-model.number="reservaForm.mesesCobertura"
              label="Meses de cobertura desejados"
              type="number"
              min="1"
              max="36"
              outlined
              dense
            />
            <div class="text-caption text-grey-7">
              Cobertura atual: <strong>{{ coberturaMeses }}</strong>
              <span v-if="despesaMedia"> · despesa média {{ brl(despesaMedia) }}/mês</span>
            </div>
            <div class="row q-gutter-sm">
              <q-btn
                color="primary"
                icon="save"
                label="Salvar reserva"
                :loading="savingReserva"
                @click="salvarReserva"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Perfil e senha -->
        <q-card>
          <q-card-section>
            <div class="text-h6">
              <q-icon name="person" class="q-mr-sm" />
              Perfil e senha
            </div>
            <div class="text-caption text-grey-7">
              A senha protege os arquivos na abertura do app. Ela fica apenas no
              <code>perfil.txt</code>, como hash PBKDF2 — nunca em texto puro.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-gutter-y-md">
            <q-input v-model="perfil.nome" label="Nome" outlined dense />
            <q-input v-model="perfil.email" label="E-mail" type="email" outlined dense />

            <div class="row q-gutter-sm">
              <q-btn
                color="primary"
                icon="save"
                label="Salvar perfil"
                :loading="savingPerfil"
                @click="salvarPerfil"
              />
            </div>

            <q-separator />

            <template v-if="auth.needsPassword">
              <q-input
                v-model="senha.atual"
                label="Senha atual"
                type="password"
                outlined
                dense
                autocomplete="current-password"
              />
              <q-input
                v-model="senha.nova"
                label="Nova senha (mín. 4 caracteres)"
                type="password"
                outlined
                dense
                autocomplete="new-password"
              />
              <div class="row q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="lock_reset"
                  label="Alterar senha"
                  :loading="savingSenha"
                  @click="alterarSenha"
                />
                <q-btn
                  outline
                  color="negative"
                  icon="lock_open"
                  label="Remover senha"
                  :loading="savingSenha"
                  @click="removerSenha"
                />
              </div>
            </template>

            <template v-else>
              <q-input
                v-model="senha.nova"
                label="Definir senha (opcional)"
                type="password"
                outlined
                dense
                autocomplete="new-password"
                hint="Ao definir uma senha, o app passa a pedi-la na abertura."
              />
              <div class="row q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="lock"
                  label="Definir senha"
                  :loading="savingSenha"
                  @click="alterarSenha"
                />
              </div>
            </template>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-5">
        <!-- Lista de arquivos -->
        <q-card>
          <q-card-section>
            <div class="text-h6">
              <q-icon name="folder_open" class="q-mr-sm" />
              Arquivos de dados
            </div>
          </q-card-section>

          <q-separator />

          <q-list separator>
            <q-item v-for="file in storage.fileList" :key="file.name">
              <q-item-section avatar>
                <q-icon name="text_snippet" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ file.name }}</q-item-label>
                <q-item-label caption>
                  {{ formatBytes(file.size) }}
                  <span v-if="file.lastModified"> · {{ dataHoraBR(file.lastModified) }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="!storage.fileList.length">
              <q-item-section class="text-grey-6">
                Nenhum arquivo gravado ainda.
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <importar-gemini-dialog v-model="dialogGemini" />

    <input
      ref="importInput"
      type="file"
      accept=".txt,text/plain"
      style="display: none"
      @change="handleImport"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useStorageStore } from 'src/stores/storage'
import { useAuthStore } from 'src/stores/auth'
import { useSettingsStore } from 'src/stores/settings'
import { usePlanStore } from 'src/stores/plan'
import { brl } from 'src/utils/format'
import { fileStorage } from 'src/services/storage/fileStorage'
import ImportarGeminiDialog from 'src/components/migration/ImportarGeminiDialog.vue'
import { formatBytes, dataHoraBR } from 'src/utils/format'

const $q = useQuasar()
const storage = useStorageStore()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const plan = usePlanStore()
const importInput = ref(null)
const dialogGemini = ref(false)

const savingPerfil = ref(false)
const savingSenha = ref(false)
const savingReserva = ref(false)

const reservaForm = ref({ valorAtual: 0, aporteMensal: 0, mesesCobertura: 6 })

const perfil = ref({
  nome: auth.user?.nome || '',
  email: auth.user?.email || '',
})

const senha = ref({ atual: '', nova: '' })

const statusColor = computed(() => {
  if (storage.needsPermission) return 'orange'
  if (storage.error) return 'negative'
  return storage.ready ? 'positive' : 'grey'
})

const lastSaved = computed(() => (storage.lastSavedAt ? dataHoraBR(storage.lastSavedAt) : '—'))

const despesaMedia = computed(() => {
  const despesas = plan.meses
    .map((mes) => (mes.itens || []).reduce((acc, item) => acc + (Number(item.valor) || 0), 0))
    .filter((total) => total > 0)
  const ultimas = despesas.slice(-3)
  if (!ultimas.length) return 0
  return ultimas.reduce((acc, total) => acc + total, 0) / ultimas.length
})

const coberturaMeses = computed(() => {
  if (!despesaMedia.value) return '—'
  return (Number(reservaForm.value.valorAtual) || 0) / despesaMedia.value
})

function notifyError(error) {
  $q.notify({
    color: 'negative',
    icon: 'error',
    message: error?.message || 'Falha na operação.',
    timeout: 6000,
  })
}

async function pickLocation() {
  try {
    await storage.pickLocation()
    $q.notify({ color: 'positive', icon: 'folder', message: 'Pasta de dados conectada.' })
  } catch (error) {
    notifyError(error)
  }
}

async function reconnect() {
  try {
    const ok = await storage.requestPermission()
    $q.notify({
      color: ok ? 'positive' : 'warning',
      icon: ok ? 'check_circle' : 'warning',
      message: ok ? 'Acesso restaurado.' : 'Permissão não concedida.',
    })
  } catch (error) {
    notifyError(error)
  }
}

async function saveNow() {
  try {
    await fileStorage.flush()
    $q.notify({ color: 'positive', icon: 'save', message: 'Dados gravados nos arquivos .txt.' })
  } catch (error) {
    notifyError(error)
  }
}

async function exportBundle() {
  try {
    await storage.exportBundle()
    $q.notify({ color: 'positive', icon: 'cloud_download', message: 'Backup baixado.' })
  } catch (error) {
    notifyError(error)
  }
}

function pickImport() {
  importInput.value?.click()
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const count = await storage.importBundle(file)
    $q.notify({
      color: 'positive',
      icon: 'publish',
      message: `${count} conjunto(s) de dados importado(s). Recarregando…`,
    })
    setTimeout(() => window.location.reload(), 900)
  } catch (error) {
    notifyError(error)
  }
}

async function confirmReset() {
  const confirmed = await new Promise((resolve) => {
    $q.dialog({
      title: 'Apagar todos os dados',
      message:
        'Todos os arquivos .txt serão removidos do armazenamento. Exporte um backup antes de continuar.',
      cancel: true,
      persistent: true,
      ok: { label: 'Apagar tudo', color: 'negative' },
    }).onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })

  if (!confirmed) return

  try {
    await storage.reset()
    $q.notify({ color: 'negative', icon: 'delete', message: 'Dados apagados. Recarregando…' })
    setTimeout(() => window.location.reload(), 900)
  } catch (error) {
    notifyError(error)
  }
}

async function salvarReserva() {
  savingReserva.value = true
  try {
    await settingsStore.updateReserva({
      valorAtual: Number(reservaForm.value.valorAtual) || 0,
      aporteMensal: Number(reservaForm.value.aporteMensal) || 0,
      mesesCobertura: Number(reservaForm.value.mesesCobertura) || 6,
    })
    $q.notify({ color: 'positive', icon: 'check_circle', message: 'Fundo de reserva salvo.' })
  } catch (error) {
    notifyError(error)
  } finally {
    savingReserva.value = false
  }
}

async function salvarPerfil() {
  savingPerfil.value = true
  try {
    await auth.saveProfile({ nome: perfil.value.nome.trim(), email: perfil.value.email.trim() })
    $q.notify({ color: 'positive', icon: 'check_circle', message: 'Perfil salvo.' })
  } catch (error) {
    notifyError(error)
  } finally {
    savingPerfil.value = false
  }
}

async function alterarSenha() {
  const nova = senha.value.nova || ''
  if (nova.length < 4) {
    $q.notify({ color: 'warning', icon: 'warning', message: 'A senha precisa ter ao menos 4 caracteres.' })
    return
  }

  savingSenha.value = true
  try {
    await auth.changePassword(senha.value.atual || '', nova)
    senha.value = { atual: '', nova: '' }
    $q.notify({ color: 'positive', icon: 'lock', message: 'Senha atualizada.' })
  } catch (error) {
    notifyError(error)
  } finally {
    savingSenha.value = false
  }
}

async function removerSenha() {
  const confirmed = await new Promise((resolve) => {
    $q.dialog({
      title: 'Remover senha',
      message: 'O aplicativo passará a abrir sem pedir senha. Deseja continuar?',
      cancel: true,
      ok: { label: 'Remover', color: 'negative' },
    }).onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
  if (!confirmed) return

  savingSenha.value = true
  try {
    await auth.removePassword()
    senha.value = { atual: '', nova: '' }
    $q.notify({ color: 'positive', icon: 'lock_open', message: 'Senha removida.' })
  } catch (error) {
    notifyError(error)
  } finally {
    savingSenha.value = false
  }
}

onMounted(async () => {
  await Promise.all([settingsStore.init(), plan.init()])
  reservaForm.value = { ...settingsStore.reserva }
})
</script>
