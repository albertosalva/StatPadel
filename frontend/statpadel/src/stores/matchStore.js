// src/stores/matchStore.js
import { defineStore } from 'pinia'
import matchService from '@/services/matchService'

export const useMatchStore = defineStore('match', {
  state: () => ({
    matches: [],
    loading: false,
    error: null,
    editingId: null,
    editingForm: { matchName: '', matchDate: null, matchLocation: ''},
    editingPlayersForm: { top_left: '', top_right: '', bottom_right: '', bottom_left: '' },
    editingPlayersValid: { top_left: null, top_right: null, bottom_right: null,bottom_left: null},
    totalMatchs: 0,
    predominantGameType: '',
    latestMatchDate: '',
    lastMatchesStats: []
  }),
  getters: {
    latestFiveMatches: (state) => state.matches.slice(0, 5)
  },
  actions: {
    async fetchMatches() {
      this.loading = true
      this.error = null
      try {
        const res = await matchService.getMyMatches()
        this.matches = res.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
      } catch (err) {
        this.error = err.response?.data?.error || err.message
      } finally {
        this.loading = false
      }
    },
    async deleteMatch(id) {
      //if (!confirm('¿Seguro que quieres eliminar este partido?')) return
      try {
        await matchService.deleteMatch(id)
        this.matches = this.matches.filter(m => m._id !== id)
      } catch (err) {
        alert(err.response?.data?.error || err.message)
      }
    },
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
    cancelEdit() {
      this.editingId = null
      this.editingForm = { matchName:'', matchDate:null, matchLocation:'' }
      this.editingPlayersForm = { top_left:'', top_right:'', bottom_right:'', bottom_left:'' }
    },
    async saveEdit(id) {
      try {
        const updatedMatch = await matchService.updateMatch(id, this.editingForm)
        const updatedPlayers = await matchService.updatePlayers(id, this.editingPlayersForm);

        const idx = this.matches.findIndex(m => m._id === id)

        if (idx !== -1) {
          this.matches[idx] = {
            ...this.matches[idx],
            // datos generales
            matchName:     updatedMatch.matchName,
            matchDate:     updatedMatch.matchDate,
            matchLocation: updatedMatch.matchLocation,
            // posiciones de jugadores actualizadas
            playerPositions: updatedPlayers.playerPositions
          }
        }
        this.cancelEdit();
      } catch (err) {
        alert(err.response?.data?.error || err.message)
      }
    },
    async verificarJugadorEditado(username, key) {
      if (!username) {
        this.editingPlayersValid[key] = null;
        return;
      }
      try {
        const { exists } = await import('@/services/userService')
                                  .then(m => m.comprobarExistencia(username));
        this.editingPlayersValid[key] = exists;
        if (!exists) {
          // mostramos un mensaje de error global
          import('element-plus').then(({ ElMessage }) =>
            ElMessage.error(`El jugador “${username}” no está registrado.`)
          );
        }
      } catch {
        this.editingPlayersValid[key] = false;
        import('element-plus').then(({ ElMessage }) =>
          ElMessage.error('Error comprobando el jugador.')
        );
      }
    },
    async loadGenralStats() {
      const stats = await matchService.fetchGenralStats()
      this.totalVideos = stats.totalVideos
      this.predominantGameType = stats.predominantGameType
      this.latestVideoDate = stats.latestVideoDate
    },
    async loadLastMatchesStats() {
      try {
        const statsArray = await matchService.getLastMatchesStats()
        this.lastMatchesStats = statsArray
        console.log('Últimas stats cargadas:', this.lastMatchesStats)
      } catch (err) {
        console.error('No se pudieron cargar últimas stats:', err)
      }
    }
    
  }
})
