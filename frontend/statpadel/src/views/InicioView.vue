<!-- src/views/Inicio.vue -->
<template>
  <el-container class="home-container">

    <!-- Header principal -->
    <el-header class="header">
      
      <!-- Logo -->
      <div class="header-logo">
        <el-image :src="logoSrc" alt="Logo StatPadel" fit="contain" style="height: 80px;"/>
      </div>

      <!-- Botones para escritorio (solo visibles en escritorio) -->
      <div class="header-buttons" v-show="!isMobile">
        <router-link to="/login">
          <el-button type="primary" round :plain="isDark">Iniciar Sesión</el-button>
        </router-link>
        <router-link to="/registro">
          <el-button type="info" round :plain="isDark">Registrarse</el-button>
        </router-link>
        <el-switch v-model="isDark" size="large" :active-action-icon="Moon" 
        :inactive-action-icon="Sunny" @change="onToggleTheme" style="--el-switch-off-color: #909399"/>
      </div>

      <!-- Icono menú hamburguesa para móvil -->
      <el-icon class="menu-icon" @click="drawerVisible = true" v-show="isMobile">
        <Expand />
      </el-icon>

      <!-- Drawer lateral para móvil -->
      <el-drawer v-model="drawerVisible" direction="rtl" :with-header="false" size="250px">
        <div class="drawer-content">
          <ul class="drawer-list">
            <li>
              <router-link to="/login">Iniciar Sesión</router-link>
            </li>
            <li>
              <router-link to="/registro">Registrarse</router-link>
            </li>
          </ul>
          <div class="drawer-switch">
            <el-switch v-model="isDark" size="large" :active-action-icon="Moon" 
            :inactive-action-icon="Sunny" @change="onToggleTheme" style="--el-switch-off-color: #909399"/>
          </div>
        </div>
      </el-drawer>

    </el-header>

    <!-- Sección principal: imagen + texto explicativo -->
    <el-main class="main-content">
      <el-row :gutter="40" align="middle">

        <!-- Columna: Imagen del jugador -->
        <el-col :span="24" :md="12">
          <div class="image-section">
            <el-image v-if="miImagen" :src="miImagen" alt="Jugador de pádel" fit="cover" style="max-width: 100%; height: auto;" />
          </div>
        </el-col>

        <!-- Columna: Título + descripción -->
        <el-col :span="24" :md="12">
          <div class="text-section">
            <h1 class="main-title">StatPadel</h1>
            <p>
              En StatPadel transformamos la forma en que gestionas y analizas tus videos deportivos. 
              Nuestra plataforma te permite subir tus videos, procesarlos para extraer insights clave 
              y obtener estadísticas precisas que te ayudarán a mejorar el rendimiento de tu equipo. 
              Descubre una experiencia integral que te acompaña desde el primer clic hasta el análisis 
              detallado de cada jugada.
            </p>
          </div>
        </el-col>

      </el-row>
    </el-main>

    <el-main class="feature-section">
      <el-row :gutter="20" justify="center">
        
        <!-- Tarjeta: Sube tus vídeos -->
        <el-col :span="24" :md="8">
          <el-card shadow="hover" class="feature-card">
            <div class="card-content">
              <el-icon size="40"><VideoCamera /></el-icon>
              <h3>Sube tus vídeos</h3>
              <p>
                Sube y organiza fácilmente tus vídeos deportivos, listos para ser analizados y revisados en nuestra plataforma.
              </p>
            </div>
          </el-card>
        </el-col>

        <!-- Tarjeta: Estadísticas -->
        <el-col :span="24" :md="8">
          <el-card shadow="hover" class="feature-card">
            <div class="card-content">
              <el-icon size="40"><PieChart /></el-icon>
              <h3>Visualiza las estadísticas </h3>
              <p>
                Accede a estadísticas clave y personalizadas para cada vídeo, ayudándote a evaluar y mejorar tu rendimiento en cada partido.
              </p>
            </div>
          </el-card>
        </el-col>

        <!-- Tarjeta: Planifica tus partidos -->
        <el-col :span="24" :md="8">
          <el-card shadow="hover" class="feature-card">
            <div class="card-content">
              <el-icon size="40"><Files /></el-icon>
              <h3>Consulta y gestiona tus partidos</h3>
              <p>
                Gestiona y consulta cómodamente el historial completo de tus vídeos y partidos, con acceso rápido a detalles y estadísticas.
              </p>
            </div>
          </el-card>
        </el-col>

      </el-row>
    </el-main>

    <!-- Pie de página -->
    <el-footer class="footer">
      <p>© StatPadel {{ currentYear }}</p> <!-- Muestra el año dinámico -->
    </el-footer>

  </el-container>

</template>



<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sunny, Moon, VideoCamera, PieChart, Expand, Files } from '@element-plus/icons-vue'
import miImagen from '@/assets/man-playing-padel.jpg'
import { useThemeStore } from '@/stores/themeStore'


// Cambiar logo según el modo oscuro
const logoSrc = computed(() =>
  isDark.value
    ? require('@/assets/logoSP.png')    // Logo oscuro
    : require('@/assets/logoSP-dark.png')  // Logo claro
)

// Estado del drawer y pantalla móvil
const drawerVisible = ref(false)
const isMobile = ref(window.innerWidth <= 768)

// Detectar cambios de tamaño de pantalla
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}

// Escuchar y limpiar eventos
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Año actual para el footer
const currentYear = new Date().getFullYear()

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})

const isDark = computed(() => themeStore.isDark)
const onToggleTheme = () => {
  themeStore.toggleTheme()
}

</script>



<style scoped>

/* ========================================= */
/* ============== HEADER PC ================ */
/* ========================================= */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 80px; /* Altura del header */
  background-color: var(--el-bg-color);
  position: relative;
}

.header-logo {
  display: flex;
  align-items: center;
  margin-left: 40px;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-right: 40px;
}

.header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--el-border-color);
  opacity: 0.4;
}

:root.dark .header::after {
  background-color: var(--el-border-color);
}


/* ========================================= */
/* ============= HEADER MÓVIL ============== */
/* ========================================= */
.menu-icon {
  cursor: pointer;
  font-size: 32px;
  position: absolute;
  right: 20px;
  top: 24px;
  color: var(--el-text-color-primary);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 20px;
}

.drawer-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.drawer-list li {
  padding: 12px 0;
  font-size: 1.2rem;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color);
}

.drawer-list li a {
  color: inherit;
  text-decoration: none;
}

.drawer-list li a:hover {
  color: var(--el-color-primary);
}

.drawer-switch {
  padding-top: 20px;
  display: flex;
  justify-content: center;
}


/* ========================================= */
/* ============ PRIMER MAIN (INFO) ========== */
/* ========================================= */
.main-content {
  padding: 60px 40px;
}

.image-section {
  display: flex;
  justify-content: center;
}

.text-section {
  padding: 20px;
}

.main-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 20px;
}

.text-section p {
  font-size: 1.2rem;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

/* ========================================= */
/* ========== SEGUNDO MAIN (TARJETAS) ======= */
/* ========================================= */
.feature-card {
  text-align: center;
  border-radius: 10px;
  min-height: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  border: 2px solid #c6e9ff;
  background-color: #f3fbff;
  transition: background-color 0.3s, border-color 0.3s;
}

:root.dark .feature-card {
  border-color: var(--el-border-color);
  background-color: var(--el-bg-color-overlay);
}

.card-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.card-content h3 {
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--el-color-primary);
  margin: 0;
}

.card-content p {
  font-size: 1rem;
  color: var(--el-text-color-primary);
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 1024px) {
  .feature-card {
    margin-bottom: 24px;
  }
}


/* ========================================= */
/* ================= FOOTER ================ */
/* ========================================= */
.footer {
  text-align: center;
  padding: 20px;
  position: relative;
  background-color: var(--el-bg-color);
  font-size: 0.9rem;
}

.footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--el-border-color);
  opacity: 0.4;
}

</style>
