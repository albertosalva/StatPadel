// src/stores/videoStore.js
import { defineStore } from 'pinia';
import videoService from '../services/videoService';


export const useVideoStore = defineStore('video', {
  state: () => ({
    macthName: null,
    macthDate: null,
    macthLocation: null,
    matchId: null,
    file: null,
    fileName: null,
    frameImage: "data:image/jpeg;base64,...",  // Imagen de placeholder inicial
    //frameImg: null,
    displayWidth: 0,
    displayHeight: 0,
    corners: [],
    playersPositions: [],
    esquinasEnviadas: false,
    analisisResultado: null,
    debugMessages: []
  }),
  actions: {
    // Agrega mensajes de depuración y los muestra por consola.
    agregarDebug(msg) {
      //console.log(msg);
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
        await videoService.uploadVideoTemp(this.file);
        return true;
      } catch (error) {
        return false;
      }
    },

    // Inicia la carga del video: sube el archivo, llama a la API para cargar el video y obtiene el primer frame.
    async iniciarCarga() {
      if (!this.file) {
        this.agregarDebug("No se ha seleccionado ningún archivo.");
        return;
      }

      const { fileName } = await videoService.uploadVideoTemp(this.file);
      this.fileName = fileName;

      const { frame } = await videoService.loadFrame(fileName);
      this.frameImage = `data:image/jpeg;base64,${frame}`;
    },

    // Registra un punto (coordenada) al hacer click en la imagen.
    registrarPunto(event, frameImg) {
      if (!frameImg) 
        return;
      const rect = frameImg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (this.corners.length < 4) {
        this.corners.push({ x: Math.floor(x), y: Math.floor(y) });
      } 
    },

    // Marca jugadores en la imagen al hacer click.
    registrarJugador(event, frameImg) {
      if (!frameImg) return;
      const rect = frameImg.getBoundingClientRect();
      const x = Math.floor(event.clientX - rect.left);
      const y = Math.floor(event.clientY - rect.top);

      if (this.playersPositions.length < 4) {
        this.playersPositions.push({ x, y });
        //this.agregarDebug(`> [STORE] Posición ${this.playersPositions.length} registrada en (${x}, ${y})`);
        console.log('[STORE] playersPositions:', this.playersPositions);
      } else {
        this.agregarDebug("Ya se han registrado 4 jugadores.");
      }
    },

    // Recibe la imagem para sacar el tamaño
    enviarImage(frameImg) {
      console.log('🚀 [STORE] enviarImage, playersPositions antes:', this.playersPositions);
      if (!frameImg) {
        this.agregarDebug("No hay imagen para enviar.");
        return;
      }
      this.displayWidth = frameImg.clientWidth;
      this.displayHeight = frameImg.clientHeight;
      this.agregarDebug(`Enviando imagen con tamaño: ${frameImg.clientWidth}x${frameImg.clientHeight}`);
      console.log('🚀 [STORE] enviarImage, playersPositions después:', this.playersPositions);
    },


    // Envía el video para que se realice el análisis y guarda el resultado.
    async analizarVideo() {
      console.log('🚀 [STORE] Se ha llamado a analizarVideo()');
      if (!this.file) {
        this.agregarDebug("No hay archivo para analizar.")
        return;
      }
      if (this.corners.length !== 4) {
        this.agregarDebug("Debe seleccionar 4 puntos antes de analizar.")
        return;
      }
      try {
        this.agregarDebug("Iniciando análisis de video con upload_video");
        //console.log('[videoStore] Que hay en playersPositions:', this.playersPositions)
        const matchName = this.macthName
        const matchDate = this.macthDate
        const matchLocation = this.macthLocation

        const esquinasFormateadas = this.corners.map(p => [p.x, p.y])
        const display_width = this.displayWidth
        const display_height = this.displayHeight
        console.log('[videoStore] Players positions:', this.playersPositions)
        const players_positions = this.playersPositions.map(p => ({ ...p }))
        console.log('[videoStore] Players positions formateados:', players_positions)
        const payload = {
          matchName,
          matchDate,
          matchLocation,
          corners: esquinasFormateadas,
          display_width,
          display_height, 
          players_positions
        };
        //console.log('[videoStore] Payload para upload_video:', payload);
        const { matchId, analysis } = await videoService.uploadVideo(this.fileName, payload)
        this.matchId           = matchId
        this.analisisResultado = analysis
        this.agregarDebug(`Respuesta de upload_video: ${JSON.stringify({matchId, analysis})}`)
        //this.analisisResultado = response.data;
      } catch (error) {
        console.error('Error en analizarVideo:', {
          status: error.response?.status,
          body:   error.response?.data,
          message:error.message
        })
        this.agregarDebug(`Error en analizarVideo: ${error.response?.data || error.message}`)
      }
    }
  }
});
