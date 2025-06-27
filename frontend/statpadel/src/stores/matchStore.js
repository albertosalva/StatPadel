// src/stores/matchStore.js

/**
 * @module    stores/matchStore
 * @description
 * Pinia store para gestionar partidos de pádel:
 * <ul>
 *   <li>Listado de partidos del usuario.</li>
 *   <li>Operaciones CRUD: obtener, borrar, editar partidos y jugadores.</li>
 *   <li>Gestión de estadísticas generales y específicas de partidos.</li>
 * </ul>
 */

import { defineStore } from 'pinia'
import axios from 'axios'
import matchService from '@/services/matchService'


export const useMatchStore = defineStore('match', {
  /**
   * @typedef {Object} MatchState
   * @property {Array<Object>} matches              Array de todos los partidos del usuario.
   * @property {boolean}       loading              Indicador de carga asíncrona.
   * @property {string|null}   error                Mensaje de error, si lo hay.
   * @property {string|null}   editingId            ID del partido en modo edición.
   * @property {Object}        editingForm          Datos del formulario de edición de partido.
   * @property {Object}        editingPlayersForm   IDs de jugadores editados por esquina.
   * @property {Object}        editingPlayersValid  Validación de cada jugador (true/false/null).
   * @property {number}        totalMatchs          Total de partidos subidos.
   * @property {string|null}   latestMatchDate      Fecha del último partido.
   * @property {Array<Object>} lastMatchesStats     Estadísticas de los últimos partidos.
   * @property {Object|null}   currentMatch         Datos del partido actualmente seleccionado.
   */
  state: () => ({
    matches: [],
    loading: false,
    error: null,
    editingId: null,
    editingForm: { matchName: '', matchDate: null, matchLocation: ''},
    editingPlayersForm: { top_left: '', top_right: '', bottom_right: '', bottom_left: '' },
    editingPlayersValid: { top_left: null, top_right: null, bottom_right: null,bottom_left: null},
    totalMatchs: 0,
    latestMatchDate: '',
    lastMatchesStats: [],
    currentMatch: null
  }),
  getters: {
    latestFiveMatches: state => state.matches.slice(0, 5),
    getVideoURL: (state) =>
    state.currentMatch?.videoPath
      ? `${axios.defaults.baseURL}${state.currentMatch.videoPath}`
      : '',
    getBallStats: (state) => {
      const analysis = state.currentMatch?.analysis
      if (!analysis?.distances?.ball || analysis.avgSpeeds?.ball === undefined || analysis.maxSpeeds?.ball === undefined) {
        return null
      }
      return {
        total_distance: analysis.distances.ball,
        average_speed:  analysis.avgSpeeds.ball,
        max_speed: analysis.maxSpeeds.ball
      }
    },
    getPlayerStats: (state) => {
      const analysis = state.currentMatch?.analysis
      const playerInfo = state.currentMatch?.playerPositions || {}

      // Si faltan datos esenciales, devolvemos null
      if (!analysis?.distances || !analysis?.avgSpeeds || !analysis?.maxSpeeds) {
        return null
      }

      // Filtrar IDs de jugadores 
      const ids = Object.keys(analysis.distances).filter(
        (id) =>
          id !== 'ball' &&
          analysis.avgSpeeds[id] !== undefined &&
          analysis.maxSpeeds[id] !== undefined
      )

      // Construir el objeto de stats
      const stats = {}
      for (const id of ids) {
        stats[id] = {
          name:           playerInfo[id]?.name   || id,
          total_distance: analysis.distances[id],
          average_speed:  analysis.avgSpeeds[id],
          max_speed:      analysis.maxSpeeds[id]
        }
      }
      return stats
    },
    getPlayerOverview: (state) => {
      const pp = state.currentMatch?.playerPositions || {}
      // Lo convertimos en un array de { id, name, avatarPath }
      return Object.entries(pp)
        .filter(([, p]) => p != null)
        .map(([id, p]) => ({
          id,
          name:       p.name,
          avatarPath: p.avatarPath,
          level:      p.level
        }))
    },
    getPlayerAvatarURL: (state) => (matchId, position) => {
      const match = state.matches.find(m => m._id === matchId)
      return match?.playerPositions?.[position]?.avatarPath || ''
    },
    getSelectedPlayerIds: (state) => {
      const posiciones = ['top_left', 'top_right', 'bottom_left', 'bottom_right'];
      const valores = posiciones.map(pos => state.editingPlayersForm[pos]);
      return valores.filter(id => id && id.trim());
    },
  },
  actions: {
    /**
     * @method fetchMatches
     * @description
     * Carga desde el servicio todos los partidos del usuario,
     * normaliza rutas de avatar y los ordena por fecha de subida.
     * @returns {Promise<void>}
     */
    async fetchMatches() {
      this.loading = true
      this.error = null
      try {
        const res = await matchService.getMyMatches()
        //console.log('[matchStore] Partidos obtenidos:', res)
        const withFullUrls = res.map(match => {
          if (match.playerPositions) {
            for (const pos of ['top_left', 'top_right', 'bottom_left', 'bottom_right']) {
              const p = match.playerPositions[pos]
              if (p && p.avatarPath) {
                // Si no empieza por http, le anteponemos baseURL
                if (!p.avatarPath.startsWith('http')) {
                  p.avatarPath = axios.defaults.baseURL + p.avatarPath
                }
              }
            }
          }
          return match
        })
        //console.log('[matchStore] Partidos con URLs completas:', withFullUrls)
        // Ahora ordenamos y asignamos
        this.matches = withFullUrls.sort(
          (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
        )
        //console.log('[matchStore] Partidos obtenidos:', normalized)
        //this.matches = res.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
      } catch (err) {
        this.error = err.response?.data?.error || err.message
      } finally {
        this.loading = false
      }
    },
    /**
     * @method deleteMatch
     * @description
     * Elimina un partido por ID y actualiza la lista local.
     * @param {string} id  ID del partido.
     * @returns {Promise<void>}
     */
    async deleteMatch(id) {
      //if (!confirm('¿Seguro que quieres eliminar este partido?')) return
      try {
        await matchService.deleteMatch(id)
        this.matches = this.matches.filter(m => m._id !== id)
      } catch (err) {
        alert(err.response?.data?.error || err.message)
      }
    },
    /**
     * @method startEdit
     * @description
     * Prepara el formulario de edición con los datos de un partido.
     * @param {Object} match  Objeto de partido a editar.
     */
    startEdit(match) {
      this.editingId = match._id
      this.editingForm = {
        matchName: match.matchName,
        matchDate: match.matchDate ? new Date(match.matchDate) : null,
        matchLocation: match.matchLocation
      }
      this.editingPlayersForm = {
        top_left:     match.playerPositions.top_left?.username || '',
        top_right:    match.playerPositions.top_right?.username || '',
        bottom_right: match.playerPositions.bottom_right?.username || '',
        bottom_left:  match.playerPositions.bottom_left?.username || '',
      }
      
    },
    /** 
     * @method cancelEdit
     * @description
     * Cancela la edición y resetea formularios.
     */
    cancelEdit() {
      this.editingId = null
      this.editingForm = { matchName:'', matchDate:null, matchLocation:'' }
      this.editingPlayersForm = { top_left:'', top_right:'', bottom_right:'', bottom_left:'' }
    },
    /**
     * @method saveEdit
     * @description
     * Guarda los cambios de partido y jugadores editados.
     * @param {string} id ID del partido.
     * @returns {Promise<void>}
     */
    async saveEdit(id) {
      try {
        await matchService.updateMatch(id, this.editingForm)
        await matchService.updatePlayers(id, this.editingPlayersForm);
        
        await this.fetchMatches()
        this.cancelEdit();
      } catch (err) {
        alert(err.response?.data?.error || err.message)
      }
    },
    /**
     * @method fetchMatch
     * @description
     * Obtiene un partido por ID y lo almacena en `currentMatch`.
     * @param {string} id  ID del partido.
     * @returns {Promise<void>}
     */
    async fetchMatch(id) {
      this.loading = true
      this.error = null
      try {
        this.currentMatch = await matchService.getMatchById(id)
        //console.log('[matchStore] Partido obtenido:', this.currentMatch)
      } catch (err) {
        this.error = err.response?.data?.error || err.message
      } finally {
        this.loading = false
      }
    },
    /**
     * @method loadGenralStats
     * @description
     * Carga estadísticas generales (total, última fecha).
     * @returns {Promise<void>}
     */
    async loadGenralStats() {
      const stats = await matchService.fetchGenralStats()
      this.totalVideos = stats.totalVideos
      this.latestVideoDate = stats.latestVideoDate
    },
    /**
     * @method loadLastMatchesStats
     * @description
     * Obtiene estadísticas de los últimos partidos para gráficas.
     * @returns {Promise<void>}
     */
    async loadLastMatchesStats() {
      try {
        const statsArray = await matchService.getLastMatchesStats()
        this.lastMatchesStats = statsArray
        //console.log('Últimas stats cargadas:', this.lastMatchesStats)
      } catch (err) {
        console.error('No se pudieron cargar últimas stats:', err)
      }
    }
    
  }
})
