<script>
/**
 * @module    views/PrincipalView
 * @component PrincipalView
 * @description
 * Vista principal tras iniciar sesión que muestra:
 * <ul>
 *   <li>Saludo personalizado al usuario.</li>
 *   <li>Acceso rápido para subir un nuevo vídeo de partido.</li>
 *   <li>Resumen general: total de partidos, nivel y fecha del último partido.</li>
 *   <li>Tabla con los 5 últimos partidos y botón para ir a sus estadísticas.</li>
 *   <li>Gráfico de estadísticas de los últimos partidos.</li>
 * </ul>
 */
</script>


<template>
  <el-container class="principal-container">
    <!-- Header global -->
    <AppHeader />

    <el-main class="dashboard-main">
      <!-- Cabecera pequeña -->
      <div class="dashboard-header">
        <div class="header-left">
          <h2 class="welcome-title">¡Hola, {{ username }}!</h2>
          <p class="dashboard-subtitle">Analiza tus partidos y mejora tu juego.</p>
        </div>
      </div>

      <!-- Sección con dos tarjetas arriba -->
      <el-row :gutter="20" class="card-row">
        <el-col :xs="24" :md="12">
          <el-card class="upload-card">
            <div class="card-header">
              <h3>🎾 Subir vídeo</h3>
            </div>
            <div class="card-body">
              <p>Sube tu partido para comenzar el análisis.</p>
              <router-link to="/subida-video">
                <el-button type="primary" :icon="Plus" size="large" :plain="isDark">
                  Subir vídeo
                </el-button>
              </router-link>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-card class="info-card">
            <div class="card-header">
              <h3>📊 Información general</h3>
            </div>
            <div class="card-body">
              <p>Total de partidos: {{ matchStore.totalVideos }}</p>
              <p>Nivel : {{authStore.getLevel}}</p>
              <p>Fecha del último partido subido: {{ formattedLatestVideoDate }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Últimos partidos -->
        <el-card class="video-card">
          <div class="video-header">
            <h3>🕹️ Últimos partidos</h3>
          </div>
          <el-divider />

          <el-table :data="latestMatches" stripe style="width: 100%;" >
            <!-- Nombre -->
            <el-table-column prop="matchName" label="Nombre" sortable />
            <!-- Fecha -->
            <el-table-column prop="matchDate" label="Fecha" sortable >
              <template #default="{ row }">
                {{ formatDate(row.matchDate) }}
              </template>
            </el-table-column>
            <!-- Lugar -->
            <el-table-column prop="matchLocation" label="Lugar" sortable />
            <!-- Estado -->
            <el-table-column prop="status" label="Estado" >
              <template #default="{ row }">
                <el-tag :type="row.status === 'analizado' ? 'success' : 'warning'"
                  effect="light" >
                  <el-icon>
                    <component :is="row.status === 'analizado' ? Check : Loading" />
                  </el-icon>
                  {{ row.status === 'analizado' ? 'Analizado' : 'Analizando' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="Acciones" class-name="col-acciones">
              <template #default="{ row }">
                <el-button
                  type="success"
                  circle
                  :icon="Histogram"
                  @click="onStats(row._id)"
                  :disabled="row.status !== 'analizado'"
                />
              </template>
            </el-table-column>

          </el-table>

          <div class="card-footer" style="text-align: right; margin-top: 16px;">
            <router-link to="/lista-partidos">
              <el-button type="primary" :icon="Files" size="large" :plain="isDark" >
                Ver más partidos
              </el-button>
            </router-link>
          </div>
        </el-card>

      <!-- Estadísticas recientes -->
      <el-card class="stats-card">
        <div class="stats-header">
          <h3>📈 Tus estadísticas en los últimos 4 partidos</h3>
        </div>
        <div class="stats-content">
          <EstadisticasJugador/>
        </div>
      </el-card>
    </el-main>

    <!-- Footer global -->
    <AppFooter />
  </el-container>
</template>



<script setup>
import { onMounted, computed} from 'vue'
import { Plus, Files, Histogram, Check, Loading } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useThemeStore } from '@/stores/themeStore'
import { useMatchStore } from '@/stores/matchStore'
import EstadisticasJugador from '@/components/UltimosPartidosStats.vue'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const matchStore = useMatchStore()
const router = useRouter()


onMounted(() => {
  themeStore.initTheme()
  matchStore.loadGenralStats()
  matchStore.fetchMatches()
})

// Obtenemos los últimos 5 partidos
const latestMatches = computed(() => matchStore.latestFiveMatches)

const isDark = computed(() => themeStore.isDark)

// Computed para nombre de usuario
const username = computed(() => authStore.getUsername)


// Formatear fecha
function formatDate(dateString) {
  const d = new Date(dateString)
  return d.toLocaleDateString()
}

const formattedLatestVideoDate = computed(() => {
  const dateStr = matchStore.latestVideoDate
  return dateStr ? formatDate(dateStr) : '—'
})

const onStats = id => {
  router.push({ name: 'ResultadosEstadisticas', params: { id } })
}
</script>

<style scoped>
.principal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}


.dashboard-main {
  padding: 0 10vw; /* 5% del ancho del viewport en los lados */
  box-sizing: border-box;
  align-items: center;
}

.dashboard-header {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
}

.header-left {
  flex: 1;
}

.welcome-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.dashboard-subtitle {
  margin: 4px 0 0;
  font-size: 1rem;
  color: var(--el-text-color-secondary);
}

.card-row {
  margin-bottom: 24px;
}

.upload-card,
.info-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-card .card-header,
.info-card .card-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.upload-card .card-header h3,
.info-card .card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.upload-card .card-body,
.info-card .card-body {
  padding: 16px;
  flex: 1;
}

.video-card {
  margin-bottom: 24px;
}

.video-header {
  padding: 16px;
}

.video-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.el-table {
  margin-top: 0;
}

.col-acciones {
  width: 90px;
  text-align: center;
}

.card-footer {
  padding: 16px;
  text-align: right;
  background-color: var(--el-background-color);
}

.stats-card {
  margin-bottom: 24px;
}

.stats-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.stats-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.stats-content {
  padding: 16px;
}


/* Cabeceras centradas */
.upload-card .card-header,
.info-card .card-header,
.video-header h3,
.stats-header h3 {
  text-align: center;
}

/* Cuerpos de tarjetas centrados */
.upload-card .card-body,
.info-card .card-body,
.stats-content {
  text-align: center;
}

/* Botones en bloque y centrados */
.el-button {
  display: block;
  margin: 12px auto;
}

/* Tabla de últimos partidos centrada */
.video-card .el-table {
  margin: 0 auto;
}

/* Celdas centradas */
.video-card .el-table th,
.video-card .el-table td {
  text-align: center;
}

.dashboard-header {
  margin-top: 3%;
  display: flex;              /* ya lo era */
  justify-content: center;    /* centra horizontalmente */
  text-align: center;         /* asegura que el texto interno quede centrado */
}

/* Opcional: si quieres asegurar que el bloque no se encoja */
.header-left {
  width: 100%;
}

</style>