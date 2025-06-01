<template>
  <!-- Ponemos clase “principal-container” en el <el-container> -->
  <el-container class="principal-container">
    <!-- Header global -->
    <AppHeader />

    <!-- El main que queremos que cambie de color -->
    <el-main class="body-container">
      <p>hola</p>
    </el-main>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
//import { useRouter } from 'vue-router'
//import { useAuthStore } from '@/stores/authStore'
import AppHeader from '@/components/AppHeader.vue'
import { useThemeStore } from '@/stores/themeStore'



const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})

</script>





<style scoped>
.principal-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  /* ¡Aquí es donde enlazamos el fondo al modo actual! */
  background-color: var(--el-bg-color);
}

/* El el-main también debe “heredar” ese var(--el-bg-color) */
.body-container {
  flex: 1;
  background-color: var(--el-bg-color);
}
</style>