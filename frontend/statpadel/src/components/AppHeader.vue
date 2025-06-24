<!-- src/components/AppHeader.vue -->
<template>

  <el-header class="header">
    <!-- Logo -->
    <div class="header-logo">
      <router-link to="/principal">
        <el-image :src="logoSrc" alt="Logo StatPadel" fit="contain" style="height: 80px;"/>
      </router-link>
    </div>

		<!-- Botones para escritorio (solo visibles en escritorio) -->
    <div class="header-buttons" v-show="!isMobile">
      <el-switch v-model="isDark" size="large" :active-action-icon="Moon" 
        :inactive-action-icon="Sunny" @change="onToggleTheme" style="--el-switch-off-color: #909399"/>

			<el-dropdown @command="handleCommand">
				<span class="el-dropdown-link">
					<el-avatar shape="square" class="user-avatar" :src="avatarUrl"/>
				</span>
				<template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="config">
                Gestionar perfil
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                Cerrar sesión
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
			</el-dropdown>
		</div>


  </el-header>

</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useThemeStore } from '@/stores/themeStore'
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()


onMounted(() => {
  themeStore.initTheme()
})

const isDark = computed(() => themeStore.isDark)
const onToggleTheme = () => {
  themeStore.toggleTheme()
}


const avatarUrl = computed(() => {
  const path = authStore.avatarPath
  const url = path ? `${axios.defaults.baseURL}${path}` : ''
  return url
})


// Cambiar logo según el modo oscuro
const logoSrc = computed(() =>
  isDark.value
    ? require('@/assets/logoSP.png')    // Logo oscuro
    : require('@/assets/logoSP-dark.png')  // Logo claro
)

// Manejar la selección del dropdown
const handleCommand = (command) => {
  if (command === 'config') {
    router.push('/configuracion-perfil')
  } else if (command === 'logout') {
		ElMessage({
      message: 'Sesion cerrada con exito',
      type: 'success',
    })
    authStore.logout()
    router.push('/')
  }
}

</script>


<style scoped>
/* ========================================= */
/* ============== HEADER PC ================ */
/* ========================================= */
.header {
  width: 100%;
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

/* ================= USER AVATAR ============== */
.user-avatar {
  font-size: 1.4rem; 
  font-family: 'Segoe UI', Arial, sans-serif; 
  color: var(--el-text-color-primary);
}



/* Estilos para el trigger del dropdown */
.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
}
.el-dropdown-link .el-icon {
  margin-left: 4px;
  font-size: 0.9rem;
}

/* Estilos para el menú desplegable */
.el-dropdown-menu {
  min-width: 160px;
  padding: 4px 0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color);
}
.el-dropdown-item {
  padding: 8px 16px;
  font-size: 0.95rem;
  color: var(--el-text-color-primary);
  transition: background-color 0.2s, color 0.2s;
}
.el-dropdown-item--divided {
  border-top: 1px solid var(--el-border-color);
  margin-top: 4px;
}
.el-dropdown-item:hover {
  background-color: var(--el-button-hover-background);
  color: var(--el-text-color-primary);
}
.el-dropdown-item.is-disabled {
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

/* Centrar en móvil */
@media (max-width: 768px) {
  .el-dropdown-menu {
    min-width: 100px;
  }
  .el-dropdown-item {
    padding: 6px 12px;
  }
}
</style>