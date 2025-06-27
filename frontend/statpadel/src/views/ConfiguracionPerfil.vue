<script>
/**
 * @module views/ConfiguracionPerfil
 * @component ConfiguracionPerfil
 * @description
 * Vista para modificar los datos del perfil del usuario. <br>
 * Permite cambiar nombre, correo electrónico, nivel, avatar y contraseña. 
 */
</script>

<template>
  <el-container class="profile-container">
    <AppHeader />

    <el-main class="profile-main">
      <el-card class="profile-card">

      <!-- Título -->
      <h1 class="profile-title">Configuración de Perfil</h1>

      <el-form ref="profileForm" :model="form" label-width="140px"
        @submit.prevent="handleSubmit" label-position="top" style="align-items: center;">
        <!-- Nombre -->
        <el-form-item label="Nombre" prop="name">
          <el-input v-model="form.name" placeholder="Nombre de usuario" :prefix-icon="User"/>
        </el-form-item>

        <!-- Email -->
        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" type="email" placeholder="Correo electrónico"
            :prefix-icon="Message" />
        </el-form-item>

        <el-form-item label="Nivel" prop="level">
          <el-select v-model="form.level" placeholder="Selecciona tu nivel" clearable>
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
            <el-option label="Principiante" value="Principiante" />
            <el-option label="Intermedio" value="Intermedio" />
            <el-option label="Avanzado" value="Avanzado" />
          </el-select>
        </el-form-item>

        <el-divider />
        <h3 class="password-title">Actualizar foto de perfil</h3>

        <!-- Avatar actual y subida -->
        <el-form-item >
          <div style="display: inline-flex; align-items: center; gap: clamp(16px, 10vw, 100px); width: 100%; display: flex; justify-content: center;">
            
            <!-- Avatar actual o previsualización -->
            <el-avatar :src="avatarPreview"  shape="square" :size="100"  style="border: 1px solid #ccc"/>

            <!-- Botón para seleccionar nueva imagen -->
            <el-upload action="" :auto-upload="false" :show-file-list="false" :on-change="handleAvatarChange">
              <el-button>Subir imagen</el-button>
            </el-upload>
          </div>
        </el-form-item>

        <el-divider />
        <h3 class="password-title">Actualizar contraseña</h3>



        <!-- Contraseña actual -->
        <el-form-item label="Contraseña actual" prop="currentPassword">
          <el-input v-model="form.currentPassword" type="password" autocomplete="off"
            placeholder="Contraseña actual" show-password :prefix-icon="Lock" />
        </el-form-item>

        <!-- Nueva contraseña -->
        <el-form-item label="Nueva contraseña" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" autocomplete="off"
            placeholder="Nueva contraseña" show-password :prefix-icon="Lock"/>
        </el-form-item>

        <!-- Confirmar nueva contraseña -->
        <el-form-item label="Repetir contraseña" prop="confirmNewPassword">
          <el-input v-model="form.confirmNewPassword" type="password" autocomplete="off"
            placeholder="Repite la nueva contraseña" show-password :prefix-icon="Lock"/>
        </el-form-item>

        <!-- Botón Guardar -->
        <el-form-item>
          <el-button class="buttom" type="primary" native-type="submit" block :plain="isDark">
            Actualizar perfil
          </el-button>
        </el-form-item>

        <el-button class="buttom" type="danger" native-type="submit" block :plain="isDark"
          @click="handleDelete">
          Eliminar cuenta
        </el-button>
      </el-form>

      
      </el-card>
    </el-main>

    <AppFooter />
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { markRaw } from 'vue'
import { User, Message, Lock, Delete  } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()

const authStore = useAuthStore()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)

// Formulario reactivo
const form = reactive({
  name: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
  level: ''
})


// Para detectar los cambios
let originalName = ''
let originalEmail = ''
let originalLevel = ''


const profileForm = ref(null)
const avatarFile = ref(null)


// Cambio de avatar
function handleAvatarChange(file) {
  avatarFile.value = file.raw
}

// Previsualización del avatar si se ha seleccionado uno si no mostramos el del store
const avatarPreview = computed(() =>
  avatarFile.value
    ? URL.createObjectURL(avatarFile.value)
    : authStore.getAvatarURL
)

// Carga datos de usuario al montar
onMounted(() => {
  originalName  = authStore.getUsername
  originalEmail = authStore.getEmail
  originalLevel = authStore.getLevel

  form.name  = originalName
  form.email = originalEmail
  form.level = originalLevel
  //console.log('[Vue] Datos de usuario cargados:', authStore.getLevel)
})

// Validación del formulario y envío de datos
async function handleSubmit() {

  profileForm.value.validate(async valid => {
    if (!valid) return

    console.log('[Vue] Validación del formulario:', form)

    //Comprobamos si hay cambios en las contraseñas
    const wantsPwdChange = form.currentPassword || form.newPassword || form.confirmNewPassword
    if (wantsPwdChange) {
      if (!form.currentPassword) {
        ElMessage.error('Debes introducir tu contraseña actual')
        return
      }
      if (form.newPassword !== form.confirmNewPassword) {
        ElMessage.error('Las nuevas contraseñas no coinciden')
        return
      }
    }

    // Comprobamos si hay cambios en los datos
    const changed = form.name  !== originalName || form.email !== originalEmail || form.level !== originalLevel || avatarFile.value || wantsPwdChange
    if (!changed) {
      ElMessage.primary('No hay cambios que guardar')
      return
    }

    const payload = {
      name: form.name,
      email: form.email,
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      level: form.level,
      avatarFile: avatarFile.value
    }

    // Confirmación antes de enviar
    try {
      await ElMessageBox.confirm(
        '¿Estás seguro de que deseas actualizar tu perfil con estos cambios?',
        'Confirmar actualización',
        {
          confirmButtonText: 'Actualizar',
          cancelButtonText: 'Cancelar',
          type: 'warning',
        }
      )

      // Llamada a la acción del store 
      await authStore.updateProfile(payload)

      // Éxito
      ElMessage.success('Perfil actualizado correctamente')

      // Limpia las contraseñas y actualiza los originales
      form.currentPassword   = ''
      form.newPassword       = ''
      form.confirmNewPassword = ''
      originalName  = form.name
      originalEmail = form.email
      avatarFile.value = null

    } catch (err) {
      // Si el usuario canceló el diálogo, no hacemos nada
      if (err === 'cancel' || err === 'close') return
      const msg = err.message || 'Error al actualizar perfil'
      ElMessage.error(msg)
    }
  })
}


// Mensaje de confirmación para eliminar cuenta
async function handleDelete() {
  try {
    await ElMessageBox.confirm(
      '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
      'Confirmar eliminación',
      {
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        type: 'error',
        icon: markRaw(Delete)
      }
    )
    // Llamada a tu servicio para borrar usuario
    await authStore.deleteAccount() 
    ElMessage.success('Cuenta eliminada correctamente')
    router.push('/')
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error('No se pudo eliminar la cuenta')
  }
}

</script>




<style scoped>
/* Layout principal */
.profile-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.profile-main {
  padding: 5vh 25vw;
  box-sizing: border-box;
  align-items: center;
}

@media (max-width: 850px) {
  .profile-main {
    padding: 5vh 10vw;
  }
}

.profile-title {
  font-size: 2rem;
  margin-bottom: 20px;
  text-align: center;
}

.password-title{
  font-size: 1.5rem;
  margin-top: 20px;
  margin-bottom: 10px;
  text-align: center;
}

.buttom{
  width: 100%;
  padding: 12px;
}

</style>
