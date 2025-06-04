<!-- src/views/GestionarVideos.vue -->
<template>
  <el-container class="videos-container">
    <AppHeader />

    <h2>Gestionar mis partidos</h2>

    <!-- Botón para crear un nuevo partido -->
    <div class="actions">
      <router-link to="/subida-video">
        <el-button type="primary" :plain="isDark" :icon="Plus">Subir nuevo vídeo</el-button>
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
      stripe
      style="width: 100%; margin-top: 20px"
      empty-text="No tienes ningún partido subido todavía."
    >
      <!-- Nombre del vídeo (editable) -->
      <el-table-column label="Nombre">
        <template #default="{ row }">
          <div v-if="matchStore.editingId === row._id">
            <el-input v-model="matchStore.editingName" size="small" />
          </div>
          <div v-else>
            {{ nombreSinExtension(row.videoName) }}
          </div>
        </template>
      </el-table-column>

      <!-- Fecha -->
      <el-table-column label="Fecha de subida" prop="uploadDate">
        <template #default="{ row }">
          {{ formatDate(row.uploadDate) }}
        </template>
      </el-table-column>

      <!-- Acciones -->
      <el-table-column label="Acciones" class-name="col-acciones">
        <template #default="{ row }">
          <div class="action-buttons" v-if="!isMobile">
            <template v-if="matchStore.editingId === row._id">
              <el-button size="small" type="success" round :icon="Check" @click="matchStore.saveEdit(row._id)">
                Guardar
              </el-button>
              <el-button size="small" round :icon="Close" @click="matchStore.cancelEdit()">
                Cancelar
              </el-button>
            </template>
            <template v-else>
              <el-button size="small" round :icon="Edit" @click="matchStore.startEdit(row)">
                Editar
              </el-button>
              <el-button size="small" round type="danger" :icon="Delete" @click="confirmarEliminacion(row._id)">
                Eliminar
              </el-button>
              <el-button size="small" round type="info" :icon="Histogram" @click="onStats(row._id)">
                Estadísticas
              </el-button>
            </template>
          </div>

          <div class="action-buttons-mobile" v-else>
            <template v-if="matchStore.editingId === row._id">
              <el-button type="success" :icon="Check" circle @click="matchStore.saveEdit(row._id)" />
              <el-button type="default" :icon="Close" circle @click="matchStore.cancelEdit()" />
            </template>
            <template v-else>
              <el-button type="default" :icon="Edit" circle @click="matchStore.startEdit(row)" />
              <el-button type="danger" :icon="Delete" circle @click="confirmarEliminacion(row._id)" />
              <el-button type="info" :icon="Histogram" circle @click="onStats(row._id)" />
            </template>
          </div>
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
import { onMounted, computed, ref, onUnmounted } from 'vue'
import { Plus, Search, Delete, Edit, Histogram, Check, Close  } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useMatchStore } from '@/stores/matchStore'
import { useThemeStore } from '@/stores/themeStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})

const isDark = computed(() => themeStore.isDark)

const matchStore = useMatchStore()
const router     = useRouter()

const search = ref('')

// Buscar partidos por nombre
const filteredMatches = computed(() =>
  matchStore.matches.filter(m =>
    m.videoName.toLowerCase().includes(search.value.toLowerCase())
  )
)

const nombreSinExtension = (nombre) => {
  const lastDot = nombre.lastIndexOf('.')
  return lastDot !== -1 ? nombre.substring(0, lastDot) : nombre
}

// Formatea fechas
const formatDate = iso => new Date(iso).toLocaleString()

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

const paginatedMatches = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredMatches.value.slice(start, end)
})

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
  max-width: 960px;
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
</style>
