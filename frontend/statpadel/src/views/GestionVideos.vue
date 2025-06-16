<!-- src/views/GestionarVideos.vue -->
<template>
  <el-container class="videos-container">
    <AppHeader />

    <h2>Gestionar mis partidos</h2>

    <!-- Botón para crear un nuevo partido -->
    <div class="actions">
      <router-link to="/subida-video">
        <el-button type="primary" :plain="isDark" :icon="Plus">Subir nuevo partido</el-button>
      </router-link>
    </div>

    <!-- Input de búsqueda -->
    <div class="actions">
      <el-input v-model="search" :prefix-icon="Search" placeholder="Buscar por nombre" clearable style="max-width: 300px" />
    </div>

    <!-- Tabla de partidos -->
    <el-table
      v-if="!matchStore.loading"
      :data="paginatedMatches"
      :table-layout="'auto'"
      style="width: 100%; margin-top: 20px"
      border
      stripe
      fit
      empty-text="No tienes ningún partido subido todavía."
    >
      <!-- Nombre del partido -->
      <el-table-column label="Nombre" prop="matchName" sortable>
        <template #default="{ row }">
          <div v-if="matchStore.editingId === row._id">
            <el-input v-model="matchStore.editingForm.matchName" size="small" />
          </div>
          <div v-else>{{ row.matchName }}</div>
        </template>
      </el-table-column>

      <!-- Fecha del partido -->
      <el-table-column label="Fecha" prop="matchDate" sortable>
        <template #default="{ row }">
          <div v-if="matchStore.editingId === row._id">
            <el-date-picker
              v-model="matchStore.editingForm.matchDate"
              type="date"
              size="small"
              placeholder="Fecha del partido"
              style="width: 120px;"
            />
          </div>
          <div v-else>{{ formatDate(row.matchDate) }}</div>
        </template>
      </el-table-column>

      <!-- Lugar del partido -->
      <el-table-column label="Lugar" prop="matchLocation" sortable>
        <template #default="{ row }">
          <div v-if="matchStore.editingId === row._id">
            <el-input v-model="matchStore.editingForm.matchLocation" size="small" />
          </div>
          <div v-else>{{ row.matchLocation }}</div>
        </template>
      </el-table-column>

      <!-- Jugadores asignados -->
      <el-table-column label="Jugadores">
        <template #default="{ row }">
          <!-- lectura -->
          <div v-if="matchStore.editingId !== row._id">
            <el-collapse accordion expand-icon-position="left">
              <el-collapse-item title="Mostrar jugadores" name="players">
                <div class="players-list">
                  <div class="player-row" v-for="(label, key) in labels" :key="key">
                    <span class="player-label">{{ label }}:</span>
                    <span class="player-name">
                      {{
                        (
                          (row.playerPositions && row.playerPositions[key]) || {}
                        ).username || 'Sin asignar'
                      }}
                    </span>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <!-- edición -->
          <div v-else>
            <el-row :gutter="12">
              <el-col
                v-for="(label, key) in labels"
                :key="key"
                :xs="24" :sm="12" :md="6"
              >
                <el-form-item :prop="`playerPositions.${key}`">
                  <div class="input-wrapper"
                      :class="{
                        valido:   matchStore.editingPlayersValid[key] === true,
                        invalido: matchStore.editingPlayersValid[key] === false
                      }"
                  >
                    <el-input
                      v-model="matchStore.editingPlayersForm[key]"
                      size="small"
                      clearable
                      :placeholder="label"
                      @blur="() => matchStore.verificarJugadorEditado(matchStore.editingPlayersForm[key], key)"
                    />
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </template>
      </el-table-column>

      <!-- Estado del vídeo -->
      <el-table-column label="Estado" prop="status">
        <template #default="{ row }">
          <el-tag :type="row.status === 'analizado' ? 'success' : 'warning'" effect="light" >
            <el-icon>
              <component :is="row.status === 'analizado' ? Check : Loading" />
            </el-icon>
            {{ row.status === 'analizado' ? 'Analizado' : 'Analizando' }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- Acciones: eliminar + estadísticas -->
      <el-table-column label="Acciones" class-name="col-acciones">
        <template #default="{ row }">
          <el-space>
            <template v-if="matchStore.editingId === row._id">
              <el-button type="success" circle :icon="Check" @click="matchStore.saveEdit(row._id)"
                :disabled="Object.values(matchStore.editingPlayersValid).some(v => v === false)"/>
              <el-button type="danger" circle :icon="Close" @click="matchStore.cancelEdit()" />
            </template >
            <template v-else>
              <el-button type="primary" circle  :icon="Edit" @click="onEditMatch(row._id)" 
                :disabled="row.owner !== userId"/>
              <el-button type="danger" circle  :icon="Delete" @click="confirmarEliminacion(row._id)"
                :disabled="row.owner !== userId"/>
              
              <el-button type="success" circle  :icon="Histogram" @click="onStats(row._id)" 
                :disabled="row.status !== 'analizado'">
              </el-button>
            </template>
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <!-- Estado de carga -->
    <div v-if="matchStore.loading" class="loading">
      <el-skeleton :rows="4" animated />
    </div>

    <div v-if="matchStore.error" class="error">
      Error: {{ matchStore.error }}
    </div>

    <el-pagination
      v-if="filteredMatches.length > pageSize"
      v-model:current-page="currentPage"
      :total="filteredMatches.length"
      :page-size="pageSize"
      layout="prev, pager, next"
      class="pagination"
    />

    <AppFooter/>
  </el-container>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { onMounted, computed, ref, onUnmounted, watch} from 'vue'
import { Plus, Search, Delete, Histogram, Check, Edit, Close, Loading  } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useMatchStore } from '@/stores/matchStore'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})

const isDark = computed(() => themeStore.isDark)

const matchStore = useMatchStore()
const router = useRouter()

const authStore = useAuthStore()
const userId = computed(() => authStore.userId)

watch(
  () => matchStore.matches,
  (list) => {
    console.log('userId:', userId.value)
    console.log('matches:', list)
  },
  { immediate: true }
)

const search = ref('')

// Buscar partidos por nombre
const filteredMatches = computed(() => {
  const term = (search.value || '').toLowerCase()

  return matchStore.matches.filter(m => {
    // m.matchName podría no existir: forzamos fallback a ''
    const name = (m.matchName || '').toLowerCase()
    return name.includes(term)
  })
})

// Paginación de partidos
const paginatedMatches = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredMatches.value.slice(start, end)
})


const labels = {
  top_left:     'Arriba Izq: ',
  top_right:    'Arriba Der: ',
  bottom_left:  'Abajo Izq: ',
  bottom_right: 'Abajo Der: '
}

function onEditMatch(id) {
  const match = matchStore.matches.find(m => m._id === id)
  if (!match) {
    console.warn(`No se encontró partido con id ${id}`)
    return
  }
  matchStore.startEdit(match)
}

// Dentro de <script setup> o en methods si usas Options API
function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString(); 
}

// Carga los partidos al montar
onMounted(() => {
  matchStore.fetchMatches()
})

// Navegar a estadísticas
const onStats = id => {
  router.push({ name: 'ResultadosEstadisticas', params: { id } })
}


const isMobile = ref(window.innerWidth <= 768)

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const currentPage = ref(1)
const pageSize = 10



const confirmarEliminacion = async (id) => {
  try {
    await ElMessageBox.confirm(
      '¿Seguro que deseas eliminar este partido? Esta acción no se puede deshacer.',
      'Confirmar eliminación',
      {
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        type: 'warning',
      }
    )

    await matchStore.deleteMatch(id)

    ElMessage({
      type: 'success',
      message: 'Partido eliminado correctamente',
    })
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage({
        type: 'error',
        message: 'Ocurrió un error al eliminar el partido',
      })
    } else {
      ElMessage({
        type: 'info',
        message: 'Eliminación cancelada',
      })
    }
  }
}
</script>

<style scoped>
.videos-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}


/* Título */
h2 {
  font-size: 2.2rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin: 20px 0 24px;
  text-align: center;
}

/* Acciones (botón + input) */
.actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

/* Tabla centrada */
.el-table {
  max-width: 1100px;
  margin: 0 auto 40px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  background-color: var(--el-bg-color-overlay);
}

/* Columna de acciones adaptativa */
::v-deep(.col-acciones) {
  min-width: 200px;
  max-width: 320px;
  width: 20%;
}

/* Botones en fila compacta (PC) */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
  align-items: center;
}

/* Botones en fila compacta (móvil) */
.action-buttons-mobile {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
  align-items: center;
}

.action-buttons-mobile .el-button {
  width: 25px;
  height: 25px;
  font-size: 16px;
  padding: 0;
  min-width: 25px;
  line-height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Carga y error */
.loading,
.error {
  text-align: center;
  margin: 32px 0;
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
}


/* Responsive ajustes */
@media (max-width: 768px) {
  .el-table {
    width: 100%;
    max-width: 100%;
    margin: 0 12px 40px;
  }

  h2 {
    font-size: 1.8rem;
  }

  .actions {
    flex-direction: column;
    align-items: center;
  }

  ::v-deep(.col-acciones) {
    min-width: 140px;
    width: auto;
    max-width: none;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  margin-bottom: 30px;
}


/* -------------------------------------------------------------------
   Grid compacto para el collapse de jugadores
   ------------------------------------------------------------------- */
.players-collapse-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  padding: 8px 0;
}

.player-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.player-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.player-name {
  margin-top: 2px;
  font-size: 0.95rem;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}



/* contorno verde cuando es válido */
.input-wrapper.valido .el-input__inner {
  border-color: #67c23a !important;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2) !important;
}

/* contorno rojo cuando es inválido */
.input-wrapper.invalido .el-input__inner {
  border-color: #f56c6c !important;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.2) !important;
}


</style>
