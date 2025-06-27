// src/services/matchService.js

/**
 * @module services/matchService
 * @description
 * Servicios para la gestión de partidos en la API de StatPadel:
 * <ul>
 *   <li><code>getMyMatches</code>: recupera todos los partidos del usuario autenticado.</li>
 *   <li><code>deleteMatch</code>: elimina un partido por su ID.</li>
 *   <li><code>updateMatch</code>: actualiza el nombre de un partido.</li>
 *   <li><code>updatePlayers</code>: actualiza las posiciones/jugadores de un partido.</li>
 *   <li><code>getMatchById</code>: recupera un partido concreto por su ID.</li>
 *   <li><code>fetchGeneralStats</code>: obtiene estadísticas generales de todos los partidos.</li>
 *   <li><code>getLastMatchesStats</code>: obtiene estadísticas de los últimos partidos jugados.</li>
 * </ul>
 */

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'


/**
 * Crea una instancia de Axios con el token JWT en la cabecera de Authorization,
 * configurada para el endpoint de partidos.
 *
 * @returns {AxiosInstance} Instancia de Axios para `/api/matches`.
 */
function getApi() {
  const auth = useAuthStore()
  const base = axios.defaults.baseURL
  return axios.create({
    baseURL: `${base}/api/matches`,
    headers: { Authorization: `Bearer ${auth.token}` }
  })
}

export default {
  
  /**
   * Recupera todos los partidos del usuario autenticado.
   *
   * @async
   * @function getMyMatches
   * @returns {Promise<Array<Object>>} Array de partidos.
   * @throws {Error} Si la petición falla.
   */
  async getMyMatches() {
    const api = getApi()
    const { data } = await api.get('/mine')
    //console.log('getMyMatches', data)
    return data
  },

  /**
   * Elimina un partido por su ID.
   *
   * @async
   * @function deleteMatch
   * @param   {string} matchId  ID del partido a eliminar.
   * @returns {Promise<void>}
   * @throws  {Error}          Si la petición falla.
   */
  async deleteMatch(matchId) {
    const api = getApi()
    await api.delete(`/${matchId}`)
  },


   /**
   * Actualiza los datos de un partido.
   *
   * @async
   * @function updateMatch
   * @param   {string} matchId      ID del partido a actualizar.
   * @param   {Object} editingForm  Datos a actualizar: nombre, fecha, ubicación.
   * @returns {Promise<Object>}     Partido actualizado.
   * @throws  {Error}               Si la petición falla.
   */
  async updateMatch(matchId, editingForm) {
    const api = getApi()
    const { data } = await api.put(`/${matchId}`, editingForm)
    return data
  },


  /**
   * Actualiza los jugadores de un partido.
   *
   * @async
   * @function updatePlayers
   * @param   {string} matchId  ID del partido.
   * @param   {FormData|Object} form   Datos de los jugadores.
   * @returns {Promise<Object>}       Mapa actualizado de `playerPositions`.
   * @throws  {Error}                  Si la petición falla.
   */
  async updatePlayers(matchId, form) {
    const api = getApi()
    const { data } = await api.put(`/${matchId}/players`, form)
    return data 
  },


  /**
   * Recupera un partido concreto por su ID.
   *
   * @async
   * @function getMatchById
   * @param   {string} matchId  ID del partido.
   * @returns {Promise<Object>} Partido completo.
   * @throws  {Error}           Si la petición falla.
   */
  async getMatchById(matchId) {
    const api = getApi()
    const { data } = await api.get(`/${matchId}`)
    return data
  },


  /**
   * Obtiene estadisticas del usuario.
   *
   * @async
   * @function fetchGeneralStats
   * @returns {Promise<Object>} Estadisticas como numero de partidos subida, nivel.
   * @throws  {Error}           Si la petición falla.
   */
  async fetchGenralStats() {
    const api = getApi()
    const { data } = await api.get('/generalStats')
    return data
  },

  /**
   * Obtiene estadísticas de los últimos partidos jugados.
   *
   * @async
   * @function getLastMatchesStats
   * @returns {Promise<Array<Object>>} Array de estadísticas de cada uno de los últimos partidos.
   * @throws  {Error}                Si la petición falla.
   */
  async getLastMatchesStats() {
    const api = getApi()
    const { data } = await api.get('/lastStats')
    //console.log('getLastMatchesStats', data)
    return data.data
  }
};