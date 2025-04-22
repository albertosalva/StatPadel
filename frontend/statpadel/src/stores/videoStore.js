// src/stores/videoStore.js
import { defineStore } from 'pinia';
import videoService from '../services/videoService';

export const useVideoStore = defineStore('video', {
  state: () => ({
    file: null,
    frameImage: "data:image/jpeg;base64,...",  // Imagen de placeholder inicial
    corners: [],
    esquinasEnviadas: false,
    analisisResultado: null,
    debugMessages: []
  }),
  actions: {
    // Agrega mensajes de depuración y los muestra por consola.
    agregarDebug(msg) {
      console.log(msg);
      this.debugMessages.push(msg);
    },

    // Guarda el archivo seleccionado y registra el evento.
    setFile(file) {
      this.file = file;
      this.agregarDebug(`Archivo seleccionado: ${file.name}`);
    },

    // Realiza la subida del archivo a una carpeta temporal.
    async subirArchivoTemp() {
      try {
        this.agregarDebug("Subiendo archivo a temp...");
        const data = await videoService.uploadVideoTemp(this.file);
        this.agregarDebug(`Archivo subido a temp: ${JSON.stringify(data)}`);
        return true;
      } catch (error) {
        this.agregarDebug(`Error al subir archivo a temp: ${error.message}`);
        return false;
      }
    },

    // Inicia la carga del video: sube el archivo, llama a la API para cargar el video y obtiene el primer frame.
    async iniciarCarga() {
      if (!this.file) {
        this.agregarDebug("No se ha seleccionado ningún archivo.");
        return;
      }

      // Verifica si el archivo es un video.
      const subido = await this.subirArchivoTemp();
      if (!subido) 
        return;

      // Llama a la API para cargar el video y obtener el primer frame.
      try {
        const videoPath = `temp/${this.file.name}`;
        this.agregarDebug(`Llamando a load_video con ruta: ${videoPath}`);
        await videoService.loadVideo(videoPath);

        this.agregarDebug("Solicitando primer frame con get_frame");
        const frameResponse = await videoService.getFrame();
        if (frameResponse && frameResponse.frame) {
          this.frameImage = `data:image/jpeg;base64,${frameResponse.frame}`;
          this.agregarDebug("Primer frame obtenido correctamente");
        } else {
          this.agregarDebug("No se pudo obtener el frame");
        }
      } catch (error) {
        this.agregarDebug(`Error en iniciarCarga: ${error.message}`);
      }
    },

    // Registra un punto (coordenada) al hacer click en la imagen.
    // CAMBIAR AL COMPONENTE
    registrarPunto(event, frameImg) {
      if (!frameImg) 
        return;
      const rect = frameImg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (this.corners.length < 4) {
        this.corners.push({ x: Math.floor(x), y: Math.floor(y) });
        this.agregarDebug(`Punto registrado: (${Math.floor(x)}, ${Math.floor(y)})`);
      } else {
        this.agregarDebug("Ya se han registrado 4 puntos.");
      }
    },

    // Envía las esquinas seleccionadas a la API.
    async enviarEsquinas(frameImg) {
      if (this.corners.length !== 4) {
        this.agregarDebug("Debe seleccionar 4 puntos antes de enviar.");
        return;
      }
      try {
        const esquinasFormateadas = this.corners.map(p => [p.x, p.y]);
        const display_width = frameImg.clientWidth;
        const display_height = frameImg.clientHeight;
        const payload = {
          corners: esquinasFormateadas,
          display_width,
          display_height
        };
        this.agregarDebug(`Enviando esquinas con payload: ${JSON.stringify(payload)}`);
        await videoService.sendCorners(payload);
        this.esquinasEnviadas = true;
      } catch (error) {
        this.agregarDebug(`Error en enviarEsquinas: ${error.message}`);
      }
    },

    // Envía el video para que se realice el análisis y guarda el resultado.
    async analizarVideo() {
      if (!this.file) {
        this.agregarDebug("No hay archivo para analizar.");
        return;
      }
      try {
        this.agregarDebug("Iniciando análisis de video con upload_video");
        const response = await videoService.uploadVideo(this.file);
        this.agregarDebug(`Respuesta de upload_video: ${JSON.stringify(response.data)}`);
        this.analisisResultado = response.data;
      } catch (error) {
        this.agregarDebug(`Error en analizarVideo: ${error.message}`);
      }
    }
  }
});
