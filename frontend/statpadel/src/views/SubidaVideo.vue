<!-- src/views/SubidaVideo.vue -->

<script>
/**
 * @module    views/SubidaVideo
 * @component SubidaVideo
 * @description
 * Componente de asistente en tres pasos para:
 * <ul>
 *   <li>Subir y configurar un vídeo de partido.</li>
 *   <li>Asignar jugadores sobre un frame.</li>
 *   <li>Marcar las esquinas de la pista para análisis.</li>
 * </ul>
 */
</script>

<template>
  <el-container class="principal-container">

    <!-- Encabezado global -->
    <AppHeader />

    <!-- Contenido principal: Proceso de 3 pasos -->
    <el-main class="subida-video">

      <!-- ===== BARRA DE PROGRESO ===== -->
      <el-steps :active="activeStep" finish-status="success" align-center>
        <el-step title="Datos y subida del partido" :icon="EditPen" />
        <el-step title="Identificar jugadores" :icon="User" />
        <el-step title="Seleccionar esquinas" :icon="Pointer" />
      </el-steps>

      <!-- ===== PASO 1: Subida de vídeo ===== -->
      <div v-if="activeStep === 0" class="paso" v-loading.fullscreen.lock="fullscreenLoading"
        element-loading-text="Subiendo el vídeo al servidor…">
        <h2>Sube tu vídeo</h2>
        
        <el-form @submit.prevent="continuarPaso1" :model="form" ref="formRef" :rules="rules"
          class="upload-form" label-width="0">

          <!-- Nombre del partido -->
          <el-input v-model="form.matchName" placeholder="Nombre del partido*" :prefix-icon="EditPen" clearable />

          <!-- Lugar -->
          <div class="autocomplete">
            <el-autocomplete v-model="form.location" :fetch-suggestions="fetchLocationSuggestions"
              @select="onSelectLocation" placeholder="Lugar del partido*" >
              <template #prefix>
                <el-icon><Location /></el-icon>
              </template>
            </el-autocomplete>
          </div>

          <!-- Fecha -->
          <el-date-picker v-model="form.date" type="date" placeholder="Fecha del partido*" :prefix-icon="Calendar" clearable />

          <!-- Área de arrastrar o hacer clic para seleccionar -->
          <el-upload class="upload-area" drag accept="video/*" :auto-upload="false"
            :limit="1" v-model:file-list="fileList" @change="onFileChange" controls >
            <el-icon class="upload-icon">
              <UploadFilled />
            </el-icon>
            <div class="upload-text">
              Arrastra el vídeo aquí o <em>haz clic para seleccionar</em>
            </div>

            <!-- Tip informativo -->
            <template #tip>
              <div class="upload-tip">
                Solo se aceptan vídeos (.mp4, .mov, .avi…)
              </div>
            </template>
          </el-upload>
        </el-form>

        <!-- Botones de navegación -->
        <div class="step-actions">
          <el-button-group>
            <el-button type="primary" disabled @click="volverAtras">
              <el-icon class="el-icon--right"><ArrowLeft /></el-icon>
              Volver
            </el-button>
            <el-button type="primary" :disabled="!canContinueStep1" @click="continuarPaso1" >
              Continuar
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>


      <!-- ===== PASO 2: Seleccionar jugadores ===== -->
      <div v-if="activeStep === 1" class="paso">
        <h2>Selecciona las posiciones de los jugadores (opcional)</h2>

        <!-- Checkbox y botón de reset -->
        <el-cotainer class="assign-controls" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <el-checkbox v-model="assignPlayers">
            Asignar jugadores para estadísticas
          </el-checkbox>
          <el-button  type="danger" @click="limpiarSeleccionJugadores" >
            Resetear selección
            <el-icon class="el-icon--right"><Delete /></el-icon>
          </el-button>
        </el-cotainer>

        <!-- 2) Mensaje instructivo -->
        <el-alert v-if="!assignPlayers"
          title="Si no deseas asignar jugadores, haz clic en Continuar para omitir este paso."
          type="primary" show-icon class="mt-4"/>

        <div v-if="frameImage" class="frame-container">

          <el-row v-if="assignPlayers" :gutter="20" class="players-inputs">
            <el-col v-for="(_, i) in nombresJugadores" :key="i" :xs="24" :sm="12" :md="6">
              <el-card shadow="hover">
                <div :class="
                  [ 'input-wrapper',
                    usuarioValido[i] === true ? 'valido' : '',
                    usuarioValido[i] === false ? 'invalido' : ''
                  ]"
                >
                  <el-select v-model="nombresJugadores[i]" filterable remote clearable
                    :placeholder="`Nombre del jugador  ${i + 1}`" :remote-method="(query) => queryUsers(query, i)"
                    :loading="loadingPlayers[i]"  @change="onPlayerSelect($event, i)" >
                    <el-option  v-for="item in playerOptions[i]" :key="item.value" :label="item.label" :value="item.value"
                      :disabled="seleccionados.includes(item.value) && item.value !== nombresJugadores[i]">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <el-avatar :src="avatarPreview(item.avatarUrl)" size="small" shape="square"/>
                        <span>{{ item.label }}</span>
                      </div>
                    </el-option>
                  </el-select>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- Imagen del primer frame + puntos -->
          <div class="image-wrapper">
            <img v-if="frameImage" :src="frameImage" alt="Primer frame del vídeo"
              @click="assignPlayers && registrarJugador($event)" ref="frameImg" />
            <div v-for="(player, i) in playersPositions" :key="i" class="punto"
              :style="{ left: player.x + 'px', top: player.y + 'px' }" @click.stop="deseleccionarJugador(i)" >
              {{ i + 1 }}
            </div>
          </div>
        </div>

        <!-- Botones de navegación -->
        <div class="step-actions">
          <el-button-group>
            <el-button type="primary" @click="volverAtras">
              <el-icon class="el-icon--right"><ArrowLeft /></el-icon>
              Volver
            </el-button>
            <el-button  type="primary" :disabled="fileList.length === 0" @click="comprobarTodosYContinuar">
                Continuar
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>


      <!-- ===== PASO 3: Seleccionar esquinas ===== -->
      <div v-if="activeStep === 2" class="paso">
        <h2>Selecciona 4 esquinas</h2>

        <div v-if="frameImage" class="frame-container">
          <p>Haz clic sobre la imagen para marcar cada esquina</p>
          <el-cotainer class="assign-controls" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <el-button  type="danger" @click="limpiarEsquinas" >
              Resetear selección
              <el-icon class="el-icon--right"><Delete /></el-icon>
            </el-button>
          </el-cotainer>

          <!-- Imagen del primer frame + puntos -->
          <div class="image-wrapper">
            <img v-if="frameImage" :src="frameImage" alt="Primer frame del vídeo"
              @click="registrarPunto($event)" ref="frameImg"/>
            <div v-for="(p, i) in corners" :key="i" class="punto"
              :style="{ left: p.x + 'px', top: p.y + 'px' }" @click.stop="deseleccionarPunto(i)" >
              {{ i + 1 }}
            </div>
          </div>
        </div>

        <!-- Botones de navegación -->
        <div class="step-actions">
          <el-button-group>
            <el-button type="primary" @click="volverAtras">
              <el-icon class="el-icon--right"><ArrowLeft /></el-icon>
              Volver
            </el-button>
            <el-button  type="primary" :disabled="corners.length < 4"  @click="analizarVideo">
              Analizar vídeo
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>

      <div v-if="!isAnalyzing">
  </div>

    </el-main>

    <!-- Pie de página global -->
    <AppFooter />
  </el-container>
</template>



<script setup>
import { ref, computed, reactive, watch} from 'vue'
import { useRouter } from 'vue-router'
import {UploadFilled, Pointer, ArrowRight, ArrowLeft, EditPen, Calendar, Location,  Delete, User } from '@element-plus/icons-vue'
import { ElMessage, ElNotification} from 'element-plus'

import { useVideoStore } from '@/stores/videoStore'
import { useAuthStore } from '@/stores/authStore'
import { comprobarExistencia, buscarUsuarios } from '@/services/userService'
import { autocompleteAddress, geocodeAddress } from '@/services/geolocationService'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'


// Store y router
const videoStore = useVideoStore()
const authStore = useAuthStore()
const router = useRouter()

// Estados para los pasos, los archivos, la imagen del frame y el loading al subir el vídeo
const activeStep = ref(0)
const fileList = ref([])
const frameImg = ref(null)
const fullscreenLoading = ref(false)

// Formulario de datos del partido
const formRef = ref(null)
const form = reactive({
  matchName: '',
  date: null,
  location: ''
})


// Validación de usuarios
const usuarioValido = ref([null, null, null, null])
const nombresJugadores = ref(["", "", "", ""])
const assignPlayers = ref(false)  

const playerOptions = ref([[], [], [], []])
const loadingPlayers = ref([false, false, false, false])


// Computed para acceder a los datos del store
const frameImage = computed(() => videoStore.frameImage)
const corners = computed(() => videoStore.corners)
const playersPositions = computed(() => videoStore.playersPositions)

// Localización: sugerencias y geocodificación
const suggError = ref(null)

/*
PASO DE LA SUBIDA DE VÍDEO Y RELLENAR DATOS DEL PARTIDO
*/
// Cambio de archivo
const onFileChange = (_file, newFileList) => {
  if (newFileList.length > 0) {
    videoStore.setFile(newFileList[newFileList.length - 1].raw)
  } else {
    videoStore.setFile(null)
  }
}

// Validación de campos del formulario
const rules = {
  matchName: [
    { required: true, message: 'Indica el nombre del partido', trigger: 'blur' }
  ],
  date: [
    { type: 'date', required: true, message: 'Selecciona una fecha', trigger: 'change' }
  ],
  location: [
    { required: true, message: 'Indica el lugar del partido', trigger: 'blur' }
  ]
}


async function fetchLocationSuggestions(query, callback) {
  try {
    suggError.value = null
    const list = await autocompleteAddress(query)
    callback(list.map(i => ({ value: i.description, placeId: i.placeId })))
  } catch (err) {
    console.error('Error autocomplete:', err)
    suggError.value = err.message
    callback([])
  }
}

async function onSelectLocation(item) {
  form.location = item.value

  try {
    const geo = await geocodeAddress(item.value)
    if (!geo) {
      ElMessage.error('No se pudieron obtener coordenadas de esa dirección.')
    }
  } catch (err) {
    ElMessage.error(`Dirección no válida: ${err.message}`)
  }
}

// Paso 1 al paso 2
const continuarPaso1 = async () => {
  formRef.value.validate(async valid => {
    if (!valid) {
      ElMessage.error('Por favor, completa correctamente todos los campos.')
      return
    }
    // 2.2 Asegurarnos de que hay un archivo
    if (fileList.value.length === 0) {
      ElMessage.error('Sube un vídeo antes de continuar.')
      return
    }

    fullscreenLoading.value = true

    videoStore.macthName = form.matchName
    videoStore.macthDate = form.date
    videoStore.macthLocation = form.location

    // Cargar el video y continuar al paso 2
    try {
      await videoStore.iniciarCarga()
      activeStep.value = 1
    } catch (e) {
      ElMessage.error('Error al iniciar la carga. Intenta de nuevo.')
    } finally {
      fullscreenLoading.value = false
    }
  })
}

// Activar el botón Continuar al paso 2
const canContinueStep1 = computed(() => {
  return (
    form.matchName &&
    form.date &&
    form.location &&
    fileList.value.length === 1
  )
})



/*
PASO DE SELECCIÓN DE JUGADORES
*/

// Click en imagen (guardar punto)
const registrarJugador = (event) => {
  videoStore.registrarJugador(event, frameImg.value)
  const idx = videoStore.playersPositions.length - 1
  const name = nombresJugadores.value[idx]
  if (name && usuarioValido.value[idx]) {
    videoStore.playersPositions[idx].username = name
  }
}

// Eliminar el jugador seleccionado
const deseleccionarJugador = (index) => {
  videoStore.playersPositions.splice(index, 1)
}


// Muestra los jugadores que empiezan por ese nombre
async function queryUsers(query, index) {
  playerOptions.value[index] = []
  if (!query || !query.trim()) {
    return
  }

  loadingPlayers.value[index] = true
  try {
    const list = await buscarUsuarios(query)
    playerOptions.value[index] = list
  } catch (err) {
    playerOptions.value[index] = []
  } finally {
    loadingPlayers.value[index] = false
  }
}

// Comprueba si el usuario existe y actualiza la validez
async function onPlayerSelect(value, index) {
  nombresJugadores.value[index] = value
  try {
    const res = await comprobarExistencia(value)
    usuarioValido.value[index] = res.exists
    if (!res.exists) {
      ElMessage.error(`El usuario “${value}” no está registrado.`)
    }
    if (videoStore.playersPositions[index]) {
      videoStore.playersPositions[index].username = value
    }
  } catch {
    usuarioValido.value[index] = false
    ElMessage.error('Error comprobando existencia de usuario.')
  }
}

// computed que junta todos los nombres ya seleccionados
const seleccionados = computed(() =>
  nombresJugadores.value.filter(n => n && n.trim())
)

// Función para obtener la URL del avatar del usuario que se muestra en el select
const avatarPreview = (path) => authStore.getUserAvatarURL(path)


// Verifica todos al continuar
const comprobarTodosYContinuar = async () => {
  // Si no quiere asignar jugadores, simplemente avanza
  if (!assignPlayers.value) {
    activeStep.value = 2
    return
  }

  const marcadas = playersPositions.value.length

  // Necesita las 4 posiciones
  if (marcadas < 4) {
    ElMessage.error(`Debes marcar las 4 posiciones (has marcado ${marcadas}).`)
    return
  }

  // Comprobar nombres inválidos
  for (let i = 0; i < 4; i++) {
    const name = nombresJugadores.value[i]?.trim()
    if (name && usuarioValido.value[i] === false) {
      ElMessage.error(`El nombre “${name}” para el jugador ${i+1} no es válido.`)
      return
    }
  }
  // Avanzar
  activeStep.value = 2
}

// Función para limpiar selección de jugadores
function limpiarSeleccionJugadores() {
  // Limpia el array de posiciones en el store
  videoStore.playersPositions = []
  // Reinicia los nombres y validaciones
  nombresJugadores.value = ['', '', '', '']
  usuarioValido.value = [null, null, null, null]
}

// Limpiar la slecion si volvemos a atras
watch(activeStep, (newStep, oldStep) => {
  if (oldStep === 1 && newStep < oldStep) {
    limpiarSeleccionJugadores()
  }
  if (oldStep === 2 && newStep < oldStep) {
    limpiarEsquinas()
  }
})


/*
PASO DE SELECCIÓN DE ESQUINAS
*/
function limpiarEsquinas() {
  videoStore.corners = []
}

// Click en imagen (guardar punto)
const registrarPunto = (event) => {
  videoStore.registrarPunto(event, frameImg.value)
}

// Eliminar punto
const deseleccionarPunto = (index) => {
  videoStore.corners.splice(index, 1)
}

// Ejecutar análisis (Paso 3)
const analizarVideo = async () => {
  videoStore.enviarImage(frameImg.value)
  try {
    videoStore.analizarVideo()

    ElNotification({
      title: 'Análisis iniciado',
      message: 'Tu vídeo está siendo analizado. Puedes seguir usando la aplicación.',
      type: 'success',
      duration: 0
    })
    videoStore.$reset()
    router.push({ name: 'Principal' })
  } finally {
    fullscreenLoading.value = false
  }
}

// Paso atrás
const volverAtras = () => {
  if (activeStep.value > 0) {
    activeStep.value -= 1
  }
}
</script>



<style scoped>
/* Mostrar correctamente loading de Element Plus */
.example-showcase .el-loading-mask {
  z-index: 9;
}

/* Layout principal */
.principal-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Paso actual */
.paso {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

/* Barra de pasos */
.el-steps {
  width: 90%;
  max-width: 1000px;
  margin: 0 auto;
}

/* Título del paso */
h2 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 24px;
}

/* Área de subida */
.upload-area {
  width: 80%;
  margin: 10px auto;
  flex-direction: column;
  justify-content: center;
  padding: 60px 20px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color-overlay);
  box-sizing: border-box;
  transition: border-color 0.25s, background-color 0.25s;
}

.upload-area:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-bg-color-light);
}

.upload-area .el-icon {
  font-size: 4rem;
  color: var(--el-color-primary);
  margin-bottom: 16px;
}

.upload-area .upload-text {
  font-size: 1.15rem;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  margin-bottom: 12px;
  text-align: center;
}

.upload-area .upload-text em {
  color: var(--el-color-primary);
  font-style: normal;
  font-weight: 500;
}

.upload-area .el-upload__tip {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-top: 16px;
}

.upload-form {
  max-width: 100%; 
  width: 100%;
  
  display: flex;
  flex-direction: column;
  gap: 1rem;   
}

.upload-form > :deep(.el-input),
.upload-form > :deep(.el-date-editor) {
  align-self: center;
  width: 80%;
  box-sizing: border-box;
}

.autocomplete {
  width: 80%; 
  align-self: center; 
  box-sizing: border-box;
}


/* Coloreado de borde en foco para todos los campos */
.upload-form :deep(.is-focus .el-input__wrapper) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}


/* Botones de pasos */
.step-actions {
  margin-top: 16px;
  text-align: center;
}

/* Botones destacados */
.continuar-btn {
  margin-top: 32px;
}

.continuar-btn .el-button {
  min-width: 180px;
  font-size: 1.1rem;
  border-radius: 4px;
}

.continuar-btn .el-button:disabled {
  background-color: var(--el-bg-color-disabled);
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

/* Imagen con puntos */
.frame-container {
  margin-top: 16px;
  text-align: center;
}

.image-wrapper {
  position: relative;
  display: inline-block;
}

.image-wrapper img {
  max-height: 80vh;
  max-width: 100%;
  width: auto;
  display: block;
  margin: 0 auto;
  border: 1px solid var(--el-border-color);
}

/* Punto marcado */
.punto {
  position: absolute;
  background-color: var(--el-color-primary);
  color: white;
  font-size: 0.85rem;
  font-weight: bold;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  cursor: pointer;
}

/* Resultado final */
.resultado {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background-color: var(--el-bg-color-overlay);
}

/* Depuración */
.debug-messages {
  margin-top: 24px;
  padding: 12px;
  border: 1px dashed var(--el-color-warning);
  border-radius: 4px;
  background-color: var(--el-bg-color-overlay);
}

.debug-messages ul {
  list-style-type: disc;
  margin-left: 20px;
  color: var(--el-text-color-secondary);
}

/* Responsive */
@media (max-width: 900px) {
  .upload-area {
    padding: 48px 24px;
  }
  .upload-icon {
    font-size: 3rem;
  }
  .upload-text {
    font-size: 1.1rem;
  }
  .paso h2 {
    font-size: 1.75rem;
  }
}

@media (max-width: 600px) {
  .subida-video {
    padding: 40px 12px;
    min-height: auto;
  }
  .upload-area {
    padding: 32px 16px;
  }
  .upload-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
  }
  .upload-text {
    font-size: 1rem;
  }
  .paso h2 {
    font-size: 1.5rem;
    margin-bottom: 24px;
  }
}


.players-inputs {
  margin-bottom: 20px;
}

.player-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-wrapper {
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 2px;
  transition: border 0.3s ease;
}

.input-wrapper.valido {
  border-color: #67c23a; /* verde */
}

.input-wrapper.invalido {
  border-color: #f56c6c; /* rojo */
}

.punto {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: red;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  text-align: center;
  line-height: 20px;
}

.assign-controls {
  display: flex;
  justify-content: center;  /* centra horizontalmente */
  align-items: center;      /* centra verticalmente */
  gap: 1rem;
  margin-bottom: 1rem;
}

</style>
