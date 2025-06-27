// src/services/videoService.js

/**
 * @module services/videoService
 * @description
 * Servicios para la gestión de vídeos en la API de StatPadel:
 * <ul>
 *   <li><code>uploadVideoTemp</code>: sube un vídeo a una carpeta temporal para previsualización.</li>
 *   <li><code>loadFrame</code>: solicita un frame concreto de un vídeo ya subido.</li>
 *   <li><code>uploadVideo</code>: envía el vídeo completo y metadatos para su análisis.</li>
 * </ul>
 */

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'


/**
 * Crea una instancia de Axios con el token JWT en la cabecera de Authorization,
 * configurada para el endpoint de vídeo.
 *
 * @returns {AxiosInstance} Instancia de Axios para `/api/video`.
 */
function getApi() {
  const auth = useAuthStore()
  const base = axios.defaults.baseURL
  return axios.create({
    baseURL: `${base}/api/video`,
    headers: {
      Authorization: `Bearer ${auth.token}`
    }
  })
}

export default {
  
  /**
   * Sube un archivo de vídeo a una carpeta temporal en el servidor.
   *
   * @async
   * @function uploadVideoTemp
   * @param   {File}   file             Archivo de vídeo a subir.
   * @returns {Promise<Object>}         Datos devueltos por el endpoint (e.g. nombre temporal).
   * @throws  {Error}                   Si la petición falla.
   */
  async uploadVideoTemp(file) {
    const api = getApi()
    const formData = new FormData()
    formData.append('file', file, file.name)
    //const response = await api.post('/api/video/upload_video_temp', formData);
    //return response.data;
    const { data } = await api.post('/upload_video_temp', formData)
    return data
  },

  /**
   * Carga el primer frame de un vídeo subido previamente.
   *
   * @async
   * @function loadFrame
   * @param   {string} fileName         Nombre del fichero temporal en servidor.
   * @returns {Promise<Object>}         Frame del vídeo solicitado.
   * @throws  {Error}                   Si la petición falla.
   */
  async loadFrame(fileName) {
    const api = getApi()
    const { data } = await api.post('/load_frame', { fileName })
    return data; 
  },

  /**
   * Envía el vídeo completo junto con metadatos para su análisis en backend.
   *
   * @async
   * @function uploadVideo
   * @param   {string} fileName         Nombre del fichero temporal en servidor.
   * @param   {Object} payload          Metadatos del análisis: <br>
   *                                    - corners: coordenadas de esquinas<br>
   *                                    - display_width: ancho de visualización<br>
   *                                    - display_height: alto de visualización<br>
   *                                    - players_positions: mapa de posiciones de jugadores<br>
   * @returns {Promise<Object>}         Resultado del análisis devuelto por el servidor.
   * @throws  {Error}                   Si la petición falla.
   */
  async uploadVideo(fileName, payload) {

    //const { corners, display_width, display_height, players_positions  } = payload;
    //console.log('[videoService] Payload recibido:', payload);
    const body = {fileName, ...payload}

    //console.log('[videoService] Cuerpo a enviar al endpoint:', body);
    const api = getApi()
    const response = await api.post('/upload_video', body)
    return response.data
  }
}