// src/stores/videoStore.js

/**
 * @module    stores/videoStore
 * @description
 * Pinia store para gestionar el flujo de subida y análisis de vídeo de partidos:
 * <ul>
 *   <li>Subida temporal y extracción de frame.</li>
 *   <li>Registro de esquinas y posiciones de jugadores.</li>
 *   <li>Envío de datos al backend para el análisis y almacenamiento del resultado.</li>
 *   <li>Acumulación de mensajes de depuración.</li>
 * </ul>
 */

import { defineStore } from 'pinia';
import videoService from '../services/videoService';


export const useVideoStore = defineStore('video', {
  /**
   * @typedef {Object} VideoState
   * @property {string|null} macthName           Nombre del partido.
   * @property {Date|null}   macthDate           Fecha del partido.
   * @property {string|null} macthLocation       Lugar del partido.
   * @property {string|null} matchId             ID asignado tras análisis.
   * @property {File|null}   file                Archivo de vídeo seleccionado.
   * @property {string|null} fileName            Nombre interno del fichero en el servidor.
   * @property {string|null} frameImage          Primer frame en base64.
   * @property {number}      displayWidth        Anchura en píxeles del elemento de imagen.
   * @property {number}      displayHeight       Altura en píxeles del elemento de imagen.
   * @property {Array<Object>} corners           Esquinas marcadas: { x, y }.
   * @property {Array<Object>} playersPositions  Posiciones de jugadores marcadas: { x, y, [username] }.
   * @property {boolean}     esquinasEnviadas    Indica si ya se enviaron las esquinas.
   * @property {Object|null} analisisResultado   Resultado devuelto por el backend.
   * @property {Array<string>} debugMessages     Mensajes de depuración.
   */
  state: () => ({
    macthName: null,
    macthDate: null,
    macthLocation: null,
    matchId: null,
    file: null,
    fileName: null,
    frameImage: null,  // Imagen de placeholder inicial
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
    /**
     * @method setFile
     * @description
     * Guarda el archivo de vídeo seleccionado.
     * @param {File} file  Vídeo elegido por el usuario.
     */
    setFile(file) {
      this.file = file;
    },

    /**
     * @method subirArchivoTemp
     * @description
     * Sube el vídeo a almacenamiento temporal.
     * @returns {Promise<boolean>} True si la subida fue exitosa.
     */
    async subirArchivoTemp() {
      try {
        await videoService.uploadVideoTemp(this.file);
        return true;
      } catch (error) {
        return false;
      }
    },
    /**
     * @method iniciarCarga
     * @description
     * Realiza la subida y obtiene el primer frame.
     * @returns {Promise<void>}
     */
    async iniciarCarga() {
      if (!this.file) {
        return;
      }

      const { fileName } = await videoService.uploadVideoTemp(this.file);
      this.fileName = fileName;

      const { frame } = await videoService.loadFrame(fileName);
      this.frameImage = `data:image/jpeg;base64,${frame}`;
    },
    /**
     * @method registrarPunto
     * @description
     * Añade una esquina (x,y) al array `corners`.
     * @param {MouseEvent} event
     * @param {HTMLElement} frameImg  Elemento de imagen para calcular posición.
     */
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
    /**
     * @method registrarJugador
     * @description
     * Añade una posición de jugador (x,y).
     * @param {MouseEvent} event
     * @param {HTMLElement} frameImg
     */
    registrarJugador(event, frameImg) {
      if (!frameImg) return;
      const rect = frameImg.getBoundingClientRect();
      const x = Math.floor(event.clientX - rect.left);
      const y = Math.floor(event.clientY - rect.top);

      if (this.playersPositions.length < 4) {
        this.playersPositions.push({ x, y });
        //console.log('[STORE] playersPositions:', this.playersPositions);
      } else {
        this.agregarDebug("Ya se han registrado 4 jugadores.");
      }
    },
    /**
     * @method enviarImage
     * @description
     * Registra las dimensiones del elemento de imagen.
     * @param {HTMLElement} frameImg
     */
    enviarImage(frameImg) {
      //console.log('[STORE] enviarImage, playersPositions antes:', this.playersPositions);
      if (!frameImg) {
        return;
      }
      this.displayWidth = frameImg.clientWidth;
      this.displayHeight = frameImg.clientHeight;
      //console.log('[STORE] enviarImage, playersPositions después:', this.playersPositions);
    },

    /**
     * @method analizarVideo
     * @description
     * Envía datos completos para análisis y guarda respuesta.
     * @returns {Promise<void>}
     */
    async analizarVideo() {
      //console.log('[STORE] Se ha llamado a analizarVideo()');
      if (!this.file) {
        return;
      }
      if (this.corners.length !== 4) {
        return;
      }
      try {
        this.frameImage = null
        //console.log('[videoStore] Que hay en playersPositions:', this.playersPositions)
        const matchName = this.macthName
        const matchDate = this.macthDate
        const matchLocation = this.macthLocation

        const esquinasFormateadas = this.corners.map(p => [p.x, p.y])
        const display_width = this.displayWidth
        const display_height = this.displayHeight
        //console.log('[videoStore] Players positions:', this.playersPositions)
        const players_positions = this.playersPositions.map(p => ({ ...p }))
        //console.log('[videoStore] Players positions formateados:', players_positions)
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
        //this.analisisResultado = response.data;
      } catch (error) {
        console.error('Error en analizarVideo:', {
          status: error.response?.status,
          body:   error.response?.data,
          message:error.message
        })
      }
    }
  }
});
