<!-- src/components/VideoUpload.vue -->
<template>
  <div class="subida-video">
    <h2>Subida y análisis de video</h2>
    
    <!-- Selección de archivo -->
    <div>
      <label for="videoFile">Selecciona un video:</label>
      <input id="videoFile" type="file" accept="video/*" @change="handleFileChange" />
    </div>
    
    <!-- Botón para iniciar el proceso -->
    <div v-if="file">
      <button @click="iniciarCarga">Cargar primer frame</button>
    </div>
    
    <!-- Mostrar el primer frame obtenido -->
    <div v-if="frameImage" class="frame-container">
      <h3>Selecciona 4 esquinas</h3>
      <div class="image-wrapper">
        <img 
          :src="frameImage" 
          alt="Primer Frame" 
          @click="registrarPunto($event)"
          ref="frameImg"
        />
        <!-- Mostrar los puntos registrados -->
        <div 
          v-for="(punto, index) in corners" 
          :key="index" 
          class="punto" 
          :style="{ left: punto.x + 'px', top: punto.y + 'px' }">
          {{ index + 1 }}
        </div>
      </div>
    </div>
    
    <!-- Botón para enviar esquinas -->
    <div v-if="corners.length === 4">
      <button @click="enviarEsquinas">Enviar esquinas</button>
    </div>
    
    <!-- Botón para ejecutar el análisis del video -->
    <div v-if="esquinasEnviadas">
      <button @click="analizarVideo">Ejecutar análisis de video</button>
    </div>
    
    <!-- Mostrar resultados del análisis -->
    <div v-if="analisisResultado">
      <h3>Resultado del análisis:</h3>
      <pre>{{ analisisResultado }}</pre>
    </div>

    <!-- Mostrar ID de la coincidencia si está disponible -->
    <div v-if="matchId">
      <h4>ID en Mongo:</h4>
      <p>{{ matchId }}</p>
    </div>

    
    <!-- Área de depuración -->
    <div class="debug-messages">
      <h4>Depuración</h4>
      <ul>
        <li v-for="(msg, index) in debugMessages" :key="index">{{ msg }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useVideoStore } from '../stores/videoStore';
import { storeToRefs } from 'pinia';

// Se crea la instancia de la tienda.
const videoStore = useVideoStore();
// Se extraen las propiedades reactivas de la tienda.
const { file, frameImage, corners, esquinasEnviadas, analisisResultado, debugMessages , matchId} = storeToRefs(videoStore);

const frameImg = ref(null);

// Maneja el cambio de archivo y delega al store para que guarde el archivo.
const handleFileChange = (event) => {
  const selected = event.target.files[0];
  if (selected) {
    videoStore.setFile(selected);
  }
};

// Inicia la carga del video (subida y obtención del primer frame).
const iniciarCarga = async () => {
  await videoStore.iniciarCarga();
};

// Registra un punto al hacer click sobre la imagen.
const registrarPunto = (event) => {
  videoStore.registrarPunto(event, frameImg.value);
};

// Envía las esquinas seleccionadas.
const enviarEsquinas = async () => {
  await videoStore.enviarEsquinas(frameImg.value);
};

// Ejecuta el análisis del video.
const analizarVideo = async () => {
  await videoStore.analizarVideo();
};

onMounted(() => {
  if (frameImg.value) {
    console.log("Imagen mostrada:", frameImg.value.clientWidth, frameImg.value.clientHeight);
  }
});
</script>

<style scoped>
.subida-video {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.subida-video h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.subida-video label {
  font-weight: bold;
  margin-bottom: 5px;
  display: block;
  color: #555;
}

.subida-video input[type="file"] {
  margin-bottom: 15px;
  display: block;
}

.subida-video button {
  background-color: #007bff;
  color: #fff;
  border: none;
  padding: 10px 20px;
  margin: 10px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.subida-video button:hover {
  background-color: #0056b3;
}

.frame-container {
  margin: 20px 0;
  text-align: center;
}

.image-wrapper {
  position: relative;
  display: inline-block;
  border: 2px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  max-width: 100%;
}

.image-wrapper img {
  width: 100%;
  height: auto;
  display: block;
}

.punto {
  position: absolute;
  background-color: #28a745;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.debug-messages {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  background-color: #f1f1f1;
  border-radius: 4px;
  font-size: 14px;
  max-height: 150px;
  overflow-y: auto;
}

.debug-messages h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #555;
}

.debug-messages ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.debug-messages li {
  margin-bottom: 5px;
  line-height: 1.4;
}
</style>
