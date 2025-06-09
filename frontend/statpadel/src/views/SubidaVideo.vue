<!-- src/views/SubidaVideo.vue -->
<template>
  <el-container class="principal-container">

    <!-- Encabezado global -->
    <AppHeader />

    <!-- Contenido principal: Proceso de 3 pasos -->
    <el-main class="subida-video">

      <!-- ===== BARRA DE PROGRESO ===== -->
      <el-steps
        :active="activeStep"
        finish-status="success"
        align-center
      >
        <el-step title="Subir vídeo" :icon="Upload" />
        <el-step title="Seleccionar esquinas" :icon="Pointer" />
        <el-step title="Ejecutar análisis" :icon="Loading" />
      </el-steps>

      <!-- ===== PASO 1: Subida de vídeo ===== -->
      <div v-if="activeStep === 0" class="paso">
        <h2>Sube tu vídeo</h2>

        <!-- Área de arrastrar o hacer clic para seleccionar -->
        <el-upload
          class="upload-area"
          drag
          accept="video/*"
          :auto-upload="false"
          :limit="1"
          v-model:file-list="fileList"
          @change="onFileChange"
        >
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

        <!-- Botones de navegación -->
        <div class="step-actions">
          <el-button-group>
            <el-button type="primary" disabled @click="volverAtras">
              <el-icon class="el-icon--right"><ArrowLeft /></el-icon>
              Volver
            </el-button>
            <el-button
              type="primary"
              :disabled="fileList.length === 0"
              @click="continuarPaso1"
            >
              Continuar
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- ===== PASO 2: Seleccionar esquinas ===== -->
      <div v-if="activeStep === 1" class="paso">
        <h2>Selecciona 4 esquinas</h2>

        <div v-if="frameImage" class="frame-container">
          <p>Haz clic sobre la imagen para marcar cada esquina</p>
          <p>Haz clic en un punto para deseleccionarlo</p>

          <!-- Imagen del primer frame + puntos -->
          <div class="image-wrapper">
            <img
              :src="frameImage"
              alt="Primer frame del vídeo"
              @click="registrarPunto($event)"
              ref="frameImg"
            />
            <div
              v-for="(p, i) in corners"
              :key="i"
              class="punto"
              :style="{ left: p.x + 'px', top: p.y + 'px' }"
              @click.stop="deseleccionarPunto(i)"
            >
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
            <el-button
              type="primary"
              :disabled="corners.length < 4"
              @click="enviarEsquinasYContinuar"
            >
              Enviar esquinas
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- ===== PASO 3: Ejecutar análisis ===== -->
      <div v-if="activeStep === 2" class="paso">
        <h2>Ejecutar análisis</h2>

        <!-- Botones principales del análisis -->
        <div class="step-actions">
          <el-button
            type="primary"
            @click="analizarVideo"
            v-loading.fullscreen.lock="fullscreenLoading"
            element-loading-text="Analizando el vídeo… esto puede tardar varios minutos"
            :element-loading-spinner="svg"
            element-loading-svg-view-box="-10, -10, 50, 50"
          >
            Analizar vídeo
          </el-button>

          <el-button
            type="success"
            @click="onStats(matchId)"
            :disabled="!matchId"
          >
            Ver estadísticas
          </el-button>
        </div>

        <!-- Botones de navegación -->
        <div class="step-actions">
          <el-button-group>
            <el-button type="primary" @click="volverAtras">
              <el-icon class="el-icon--right"><ArrowLeft /></el-icon>
              Volver
            </el-button>
            <el-button type="primary" disabled>
              Continuar
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- ===== SECCIÓN OPCIONAL DE DEPURACIÓN ===== -->
      <!--
      <div v-if="debugMessages.length" class="debug-messages">
        <h4>Depuración</h4>
        <ul>
          <li v-for="(msg, i) in debugMessages" :key="i">{{ msg }}</li>
        </ul>
      </div>
      -->

    </el-main>

    <!-- Pie de página global -->
    <AppFooter />
  </el-container>
</template>



<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  UploadFilled,
  Upload,
  Pointer,
  Loading,
  ArrowRight,
  ArrowLeft
} from '@element-plus/icons-vue'

import { useVideoStore } from '@/stores/videoStore'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'

// Store y router
const videoStore = useVideoStore()
const router = useRouter()

// Estado
const activeStep = ref(0)
const fileList = ref([])
const frameImg = ref(null)
const fullscreenLoading = ref(false)

// SVG para loading
const svg = `
  <path class="path" d="
    M 30 15
    L 28 17
    M 25.61 25.61
    A 15 15, 0, 0, 1, 15 30
    A 15 15, 0, 1, 1, 27.99 7.5
    L 15 15
  " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
`

// Computed
const matchId = computed(() => videoStore.matchId)
const frameImage = computed(() => videoStore.frameImage)
const corners = computed(() => videoStore.corners)
//const debugMessages = computed(() => videoStore.debugMessages)

// Navegar a estadísticas
const onStats = (id) => {
  router.push({ name: 'ResultadosEstadisticas', params: { id } })
}

// Cambio de archivo
const onFileChange = (_file, newFileList) => {
  if (newFileList.length > 0) {
    videoStore.setFile(newFileList[newFileList.length - 1].raw)
  } else {
    videoStore.setFile(null)
  }
}

// Paso 1 → Paso 2
const continuarPaso1 = async () => {
  if (fileList.value.length === 0) return
  await videoStore.iniciarCarga()
  activeStep.value = 1
}

// Click en imagen (guardar punto)
const registrarPunto = (event) => {
  videoStore.registrarPunto(event, frameImg.value)
}

// Eliminar punto
const deseleccionarPunto = (index) => {
  videoStore.corners.splice(index, 1)
}

// Paso 2 → Paso 3
const enviarEsquinasYContinuar = async () => {
  videoStore.enviarImage(frameImg.value)
  activeStep.value = 2
}

// Ejecutar análisis (Paso 3)
const analizarVideo = async () => {
  fullscreenLoading.value = true
  try {
    //await videoStore.enviarEsquinas()
    await videoStore.analizarVideo()
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
</style>
