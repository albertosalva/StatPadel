<!-- src/components/AppHeader.vue -->
<template>
	
  <el-header class="header">
    <!-- Logo -->
    <div class="header-logo">
      <el-image :src="logoSrc" alt="Logo StatPadel" fit="contain" style="height: 80px;"/>
    </div>

		<!-- Botones para escritorio (solo visibles en escritorio) -->
    <div class="header-buttons" v-show="!isMobile">
      <el-switch v-model="isDark" size="large" :active-action-icon="Moon" 
        :inactive-action-icon="Sunny" @change="onToggleTheme" style="--el-switch-off-color: #909399"/>
			<el-avatar shape="square"> user </el-avatar>
		</div>
  </el-header>

</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useThemeStore } from '@/stores/themeStore'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})

const isDark = computed(() => themeStore.isDark)
const onToggleTheme = () => {
  themeStore.toggleTheme()
}



// Cambiar logo según el modo oscuro
const logoSrc = computed(() =>
  isDark.value
    ? require('@/assets/logoSP.png')    // Logo oscuro
    : require('@/assets/logoSP-dark.png')  // Logo claro
)



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
</style>