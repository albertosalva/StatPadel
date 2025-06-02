<template>
  <!-- Ponemos clase “principal-container” en el <el-container> -->
  <el-container class="principal-container">
    <!-- Header global -->
    <AppHeader />

    <!-- Main con título, subtítulo y dos tarjetas -->
    <el-main class="dashboard-main">

      <div class="dashboard-header">
        <div class="welcome-block">
          <h2 class="welcome-title">¡Bienvenido, {{ username }}!</h2>
        </div>
        <h1 class="dashboard-title">StatPadel</h1>
        <p class="dashboard-subtitle">
          Tu plataforma para gestionar y analizar vídeos deportivos en un solo lugar.
        </p>
      </div>

      <!-- Dos columnas con tarjetas -->
      <el-row :gutter="24" class="dashboard-cards">
        <!-- Columna 1: Subir/Analizar Vídeo -->
        <el-col :span="24" :md="12">
          <el-card shadow="hover" class="dashboard-card">
            <div class="card-content">
              <el-icon size="48"><VideoCamera /></el-icon>
              <h3 class="card-title">Sube y analiza vídeos</h3>
              <p class="card-desc">
                Envía tu vídeo de partido para procesarlo y obtener estadísticas detalladas.
              </p>
              <router-link to="/subida-video">
                <el-button type="primary" :plain="isDark">Subir Vídeo</el-button>
              </router-link>
            </div>
          </el-card>
        </el-col>

        <!-- Columna 2: Lista de Vídeos -->
        <el-col :span="24" :md="12">
          <el-card shadow="hover" class="dashboard-card">
            <div class="card-content">
              <el-icon size="48"><Files /></el-icon>
              <h3 class="card-title">Ver lista de vídeos</h3>
              <p class="card-desc">
                Accede a todos tus vídeos procesados y revisa sus estadísticas.
              </p>
              <router-link to="/gestion-videos">
                <el-button type="primary" :plain="isDark">Lista de Vídeos</el-button>
              </router-link>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-main>

    <AppFooter/>

  </el-container>
</template>

<script setup>
import { onMounted, computed} from 'vue'
import { Files, VideoCamera } from '@element-plus/icons-vue'
//import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useThemeStore } from '@/stores/themeStore'


const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})

const isDark = computed(() => themeStore.isDark)

// Computed para nombre de usuario
const username = computed(() => authStore.getUsername)

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

/* ========================================= */
/* ======== ENCABEZADO PRINCIPAL =========== */
/* ========================================= */
.dashboard-main {
  padding: 40px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 40px;
}

.dashboard-title {
  font-size: 3rem;
  font-weight: 700;
  color: var(--el-color-primary);
  margin: 0;
}

.dashboard-subtitle {
  font-size: 1.2rem;
  color: var(--el-text-color-secondary);
  margin-top: 12px;
}

/* ========================================= */
/* ======== BLOQUE DE BIENVENIDA =========== */
/* ========================================= */
.dashboard-header {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-block {
  margin-bottom: 16px;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin: 0;
}

/* ========================================= */
/* ============ TARJETAS =================== */
/* ========================================= */
.dashboard-cards {
  /* margen top para separar del encabezado */
  margin-top: 20px;
}

.dashboard-card {
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  transition: transform 0.2s;
}

.dashboard-card:hover {
  transform: translateY(-4px);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin: 0;
}

.card-desc {
  font-size: 1rem;
  color: var(--el-text-color-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

/* Asegura que los botones no ocupen todo el ancho en móvil */
.card-content .el-button {
  width: auto;
  min-width: 140px;
}

/* Responsive: que cada tarjeta ocupe toda la fila en pantallas muy pequeñas */
@media (max-width: 768px) {
  .dashboard-card {
    margin-bottom: 24px;
  }
}

</style>