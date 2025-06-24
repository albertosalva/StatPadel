<template>
  <el-container class="register-container">
    <el-main>
      <el-image :src="logoSrc" alt="Logo StatPadel" fit="contain" style="height: 100px;"/>

      <!-- Nombre de la app -->
      <h1 class="register-title">StatPadel</h1>

      <!-- Subtítulo -->
      <h2 class="register-subtitle">Registrarse</h2>

      <el-form @submit.prevent="handleRegister" :model="form" ref="registerForm" label-width="100px">
        <el-input v-model="form.username" placeholder="Usuario" :prefix-icon="User"/>
        <el-input v-model="form.email" placeholder="Email" :prefix-icon="Message"/>
        <el-select v-model="form.level" placeholder="Selecciona tu nivel" clearable>
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
          <el-option label="Principiante" value="Principiante" />
          <el-option label="Intermedio" value="Intermedio" />
          <el-option label="Avanzado" value="Avanzado" />
        </el-select>
        <el-input v-model="form.password" type="password" placeholder="Contraseña" show-password :prefix-icon="Lock"/>
        <el-input v-model="form.confirmPassword" type="password" placeholder="Confirmar contraseña" show-password :prefix-icon="Lock"/>
        <el-button type="primary" native-type="submit" block :plain="isDark">Registrarse</el-button>
      </el-form>

      <!-- Mensaje de error -->
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon />

      <p class="register-link">
        ¿Tienes una cuenta?
        <router-link to="/login">Iniciar Sesión</router-link>
      </p>

      <el-switch v-model="isDark" size="large" :active-action-icon="Moon" 
      :inactive-action-icon="Sunny" @change="onToggleTheme" style="--el-switch-off-color: #909399"/>

    </el-main>


  </el-container>
  
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Sunny, Moon, User, Lock, Message } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'

import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Formulario 
const form = ref({username: '', email: '', password: '', confirmPassword: '', level: ''})
const errorMessage = ref('')

const handleRegister = async () => {
  // Limpiar mensaje de error antes de intentar de nuevo
  errorMessage.value = ''
  try {
    await authStore.register(
      form.value.username,
      form.value.email,
      form.value.password,
      form.value.confirmPassword,
      form.value.level
    )
    ElMessage({
      message: 'Usuario registrado exitosamente',
      type: 'success',
    })
    router.push('/login')
  } catch (error) {
    // Mostrar el mensaje de error proveniente del store
    errorMessage.value = error.response?.data?.message || error.message || 'Error en el registro'
  }
}

// Logo dinámico
const logoSrc = computed(() =>
  isDark.value
    ? require('@/assets/logoSP.png')
    : require('@/assets/logoSP-dark.png')
)

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
/* Contenedor principal: ocupa toda la pantalla y centra el contenido */
.register-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-bg-color); /* se adapta al tema */
}

/* El <el-main> interno se muestra como una “card” */
.register-container .el-main {
  background-color: var(--el-bg-color-overlay);
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  max-width: 380px;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  border: 2px solid var(--el-border-color); /* borde claramente visible */
}

/* Logo centrado en la parte superior */
.register-container .el-image {
  margin: 0 auto 20px;
}

/* Título principal */
.register-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--el-text-color-primary);
}

/* Subtítulo */
.register-subtitle {
  font-size: 1.2rem;
  font-weight: 500;
  margin: 0 0 24px;
  color: var(--el-text-color-secondary);
}

/* Ajustar ancho del formulario y centrarlo */
.register-container .el-form {
  max-width: 280px;
  margin: 0 auto 16px;
  display: flex;
  flex-direction: column;
  gap: 16px; /* espacio entre campos */
}

/* Inputs y botón ocupan todo el ancho */
.register-container .el-form .el-input,
.register-container .el-form .el-button {
  width: 100%;
}

/* Botón “Iniciar sesión” */
.register-container .el-button[type="primary"] {
  font-weight: 500;
}

/* Espacio antes del mensaje de error */
.register-container .el-alert {
  margin-top: 16px;
}

/* Enlace de registro debajo del formulario */
.register-link {
  margin-top: 20px;
  font-size: 0.95rem;
  color: var(--el-text-color-secondary);
}
.register-link a {
  color: var(--el-color-primary);
  font-weight: 500;
  margin-left: 4px;
}
.register-link a:hover {
  text-decoration: underline;
}

/* Posicionar el switch de tema al final, centrado */
.register-container .el-switch {
  margin-top: 24px;
}

/* Adaptaciones responsivas */
@media (max-width: 480px) {
  .register-container .el-main {
    padding: 30px 20px;
  }
  .register-title {
    font-size: 1.8rem;
  }
  .register-subtitle {
    font-size: 1.1rem;
  }
  .register-container .el-form {
    max-width: 100%;
  }
}

/* Aplicar la tipografía base de Element Plus a TODO el contenedor */
.register-container {
  /* Fuente, tamaño y altura de línea de Element Plus */
  font-family:  var(--el-font-family);
  font-size:    var(--el-font-size-base);
  line-height:  var(--el-line-height-base);
}



</style>

