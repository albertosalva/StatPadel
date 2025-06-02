<!-- src/views/SubidaVideo.vue -->
<template>
  <el-container class="principal-container">
    <!-- Header global -->
    <AppHeader />

    <!-- Main donde van los 3 pasos -->
    <el-main class="subida-video">
      <!-- BARRA DE STEPS -->
      <el-steps
        :active="activeStep"
        finish-status="success"
        align-center
      >
        <el-step title="Subir vídeo" :icon="Upload"/>
        <el-step title="Seleccionar esquinas" :icon="Pointer"/>
        <el-step title="Ejecutar análisis" :icon="Loading"/>
      </el-steps>

      <!-- ===== PASO 1: Subir vídeo ===== -->
      
      <div v-if="activeStep === 0" class="paso-1">

        <!-- area de arrastrar/hacer clic -->
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
          <template #tip>
            <div class="upload-tip">
              Solo se aceptan vídeos (.mp4, .mov, .avi…)
            </div>
          </template>
        </el-upload>

        <!-- Botón “Continuar” -->
        <div style="margin-top: 16px; text-align: center;">
          <el-button
            type="primary"
            :disabled="fileList.length === 0"
            @click="continuarPaso1"
          >
            Continuar
          </el-button>
        </div>
      </div>

      <!-- ===== PASO 2: Seleccionar esquinas ===== -->
      <div v-if="activeStep === 1" class="paso-2">
        <h2>Selecciona 4 esquinas</h2>
        <div v-if="frameImage" class="frame-container">
          <p>Haz clic sobre la imagen para marcar cada esquina:</p>
          <div class="image-wrapper">
            <img
              :src="frameImage"
              alt="Primer frame"
              @click="registrarPunto($event)"
              ref="frameImg"
            />
            <div
              v-for="(p, i) in corners"
              :key="i"
              class="punto"
              :style="{ left: p.x + 'px', top: p.y + 'px' }"
            >
              {{ i + 1 }}
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; text-align: center;">
          <el-button
            type="primary"
            :disabled="corners.length < 4"
            @click="enviarEsquinasYContinuar"
          >
            Enviar esquinas y continuar
          </el-button>
        </div>
      </div>

      <!-- ===== PASO 3: Ejecutar análisis ===== -->
      <div v-if="activeStep === 2" class="paso-3">
        <h2>Ejecutar análisis</h2>
        <div style="text-align: center; margin-top: 16px;">
          <el-button type="primary" @click="analizarVideo">
            Analizar vídeo
          </el-button>
        </div>
        <div v-if="analisisResultado" class="resultado">
          <h3>Resultado del análisis:</h3>
          <pre>{{ analisisResultado }}</pre>
        </div>
        <div v-if="matchId" class="resultado">
          <h4>ID en Mongo:</h4>
          <p>{{ matchId }}</p>
        </div>
      </div>

      <!-- ===== Depuración (opcional) ===== -->
      <div v-if="debugMessages.length" class="debug-messages">
        <h4>Depuración</h4>
        <ul>
          <li v-for="(msg, i) in debugMessages" :key="i">
            {{ msg }}
          </li>
        </ul>
      </div>
    </el-main>

    <!-- Footer global -->
    <AppFooter />
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UploadFilled, Upload, Pointer, Loading } from '@element-plus/icons-vue'
import { useVideoStore } from '@/stores/videoStore'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'

// 1) Instanciamos la tienda de vídeo
const videoStore = useVideoStore()

// 2) Control del paso activo (0 = subir, 1 = esquinas, 2 = análisis)
const activeStep = ref(0)

// 3) Lista reactiva de archivos (sempre iterable)
const fileList = ref([])

// 4) Cuando cambie fileList, guardamos el archivo real en el store
const onFileChange = (_file, newFileList) => {
  if (newFileList.length > 0) {
    // Usamos el último raw file
    videoStore.setFile(newFileList[newFileList.length - 1].raw)
  } else {
    videoStore.setFile(null)
  }
}

// 5) “Continuar” en el Paso 1: sube el video y avanza a Paso 2
const continuarPaso1 = async () => {
  if (fileList.value.length === 0) return
  await videoStore.iniciarCarga()
  activeStep.value = 1
}

// 6) Acceder a propiedades del store para Paso 2 y 3
const frameImage = computed(() => videoStore.frameImage)
const corners = computed(() => videoStore.corners)
const debugMessages = computed(() => videoStore.debugMessages)
const analisisResultado = computed(() => videoStore.analisisResultado)
const matchId = computed(() => videoStore.matchId)

// 7) Registrar punto sobre la imagen (Paso 2)
const registrarPunto = event => {
  videoStore.registrarPunto(event, frameImg.value)
}

// 8) Para enviar esquinas y pasar a Paso 3
const enviarEsquinasYContinuar = async () => {
  await videoStore.enviarEsquinas(frameImg.value)
  activeStep.value = 2
}

// 9) Ejecutar análisis final (Paso 3)
const analizarVideo = async () => {
  await videoStore.analizarVideo()
}

// 10) Referencia a la etiqueta <img> para calcular coordenadas
const frameImg = ref(null)
</script>

<style scoped>
.principal-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ---- Paso 1: Upload area ---- */
/* ===========================
   Contenedor principal
   =========================== */

/* ===========================
   Barra de pasos (Steps)
   =========================== */
/* 1) Hacer más ancha la barra de Steps */
.el-steps {
  width: 90%;          /* Ocupa el 90% del contenedor padre */
  max-width: 1000px;   /* O el valor máximo que prefieras */
  margin: 0 auto;      /* Centrarlo horizontalmente */
}

/* ===========================
   Paso 1: Subir vídeo
   =========================== */
.paso-1 {
  width: 100%;
  max-width: 1000px;      /* Mismo ancho que la zona de pasos */
  margin: 0 auto;
  text-align: center;
}

/* Título del paso */
.paso-1 h2 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 24px;
}

.upload-area {
  width: 80%;                       /* Ya lo tenías así para que ocupe casi todo */
  margin: 0 auto;                   /* ① Centra el cuadro en el padre */
  flex-direction: column;           /*     para poder apilar icono/texto/”tip” */
  justify-content: center;          /*     y centrarlo verticalmente */
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color-overlay);
  padding: 60px 20px;
  box-sizing: border-box;
  transition: border-color 0.25s, background-color 0.25s;
  margin: 10px auto; /* ② Añade margen para separar del título */
}

.upload-area:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-bg-color-light);
}

/* Ícono dentro del área de subida */
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

/* Destacar parte clicable */
.upload-area .upload-text em {
  color: var(--el-color-primary);
  font-style: normal;
  font-weight: 500;
}

/* Texto de la “tip” (subtexto) debajo del área */
.upload-area .el-upload__tip {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-top: 16px;
}


/* ===========================
   Botón “Continuar”
   =========================== */
.continuar-btn {
  margin-top: 32px;
}

.continuar-btn .el-button {
  min-width: 180px;
  font-size: 1.1rem;
  border-radius: 4px;
}

/* Botón deshabilitado */
.continuar-btn .el-button:disabled {
  background-color: var(--el-bg-color-disabled);
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}





/* ---- Paso 2: Selección de esquinas ---- */
.frame-container {
  margin-top: 16px;
  text-align: center;
}
.image-wrapper {
  position: relative;
  display: inline-block;
}
.image-wrapper img {
  max-width: 100%;
  border: 1px solid var(--el-border-color);
}
.punto {
  position: absolute;
  background-color: var(--el-color-primary);
  color: white;
  font-size: 0.85rem;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
}




/* ---- Paso 3 y Resultados ---- */
.resultado {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background-color: var(--el-bg-color-overlay);
}
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








/* Responsive: ajustar márgenes en pantallas pequeñas */
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
  .paso-1 h2 {
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
  .paso-1 h2 {
    font-size: 1.5rem;
    margin-bottom: 24px;
  }
}
</style>
