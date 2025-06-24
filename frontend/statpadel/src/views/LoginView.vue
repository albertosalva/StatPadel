<template>
  <el-container class="login-container">
    <el-main>
      <el-image :src="logoSrc" alt="Logo StatPadel" fit="contain" style="height: 100px;"/>

      <!-- Nombre de la app -->
      <h1 class="login-title">StatPadel</h1>

      <!-- Subtítulo -->
      <h2 class="login-subtitle">Iniciar sesión</h2>

      <el-form @submit.prevent="handleLogin" :model="form" ref="loginForm" label-width="100px">
        <el-input v-model="form.username" placeholder="Usuario" :prefix-icon="User"/>
        <el-input v-model="form.password" type="password" placeholder="Contraseña" show-password :prefix-icon="Lock"/>
        <el-button type="primary" native-type="submit" block :plain="isDark">Iniciar sesión</el-button>
      </el-form>

      <!-- Mensaje de error -->
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon />
    
      <p class="register-link">
        ¿No tienes cuenta?
        <router-link to="/registro">Regístrate</router-link>
      </p>

      <el-switch v-model="isDark" size="large" :active-action-icon="Moon" 
      :inactive-action-icon="Sunny" @change="onToggleTheme" style="--el-switch-off-color: #909399"/>
    </el-main>

  </el-container>
  
</template>


<script setup>

import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Sunny, Moon, User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'

import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()


// Formulario de login
const form = ref({username: '', password: ''})
const errorMessage = ref('')

// Función para iniciar sesión
const handleLogin = async () => {
  errorMessage.value = ''
  try {
    await authStore.login(form.value.username, form.value.password)
    //alert('Inicio de sesión exitoso')
    ElMessage({
      message: 'Inicio de sesión exitoso',
      type: 'success',
    })
    router.push('/principal')
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al iniciar sesión'
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
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-bg-color); /* se adapta al tema */
}

/* El <el-main> interno se muestra como una “card” */
.login-container .el-main {
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
.login-container .el-image {
  margin: 0 auto 20px;
}

/* Título principal */
.login-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--el-text-color-primary);
}

/* Subtítulo */
.login-subtitle {
  font-size: 1.2rem;
  font-weight: 500;
  margin: 0 0 24px;
  color: var(--el-text-color-secondary);
}

/* Ajustar ancho del formulario y centrarlo */
.login-container .el-form {
  max-width: 280px;
  margin: 0 auto 16px;
  display: flex;
  flex-direction: column;
  gap: 16px; /* espacio entre campos */
}

/* Inputs y botón ocupan todo el ancho */
.login-container .el-form .el-input,
.login-container .el-form .el-button {
  width: 100%;
}

/* Botón “Iniciar sesión” */
.login-container .el-button[type="primary"] {
  font-weight: 500;
}

/* Espacio antes del mensaje de error */
.login-container .el-alert {
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
.login-container .el-switch {
  margin-top: 24px;
}

/* Adaptaciones responsivas */
@media (max-width: 480px) {
  .login-container .el-main {
    padding: 30px 20px;
  }
  .login-title {
    font-size: 1.8rem;
  }
  .login-subtitle {
    font-size: 1.1rem;
  }
  .login-container .el-form {
    max-width: 100%;
  }
}

/* Aplicar la tipografía base de Element Plus a TODO el contenedor */
.login-container {
  /* Fuente, tamaño y altura de línea de Element Plus */
  font-family:  var(--el-font-family);
  font-size:    var(--el-font-size-base);
  line-height:  var(--el-line-height-base);
}
</style>
