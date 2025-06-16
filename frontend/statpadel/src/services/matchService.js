// src/services/matchService.js
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

// Crea una instancia de Axios con el token ya incluido
function getApi() {
  const auth = useAuthStore()
  const base = axios.defaults.baseURL
  return axios.create({
    baseURL: `${base}/api/matches`,
    headers: { Authorization: `Bearer ${auth.token}` }
  })
}

export default {
  // Recupera todos los partidos del usuario logueado 
  async getMyMatches() {
    const api = getApi()
    const { data } = await api.get('/mine')
    console.log('getMyMatches', data)
    return data
  },

  // Elimina un partido por su ID 
  async deleteMatch(matchId) {
    const api = getApi()
    await api.delete(`/${matchId}`)
  },

  // Actualiza solo el nombre de un partido 
  async updateMatch(matchId, editingForm) {
    const api = getApi()
    const { data } = await api.put(`/${matchId}`, editingForm)
    return data
  },

  async updatePlayers(matchId, form) {
    const api = getApi()
    const { data } = await api.put(`/${matchId}/players`, form)
    return data   // espera que devuelva playerPositions actualizado
  },

  // Recupera un partido por su ID
  async getMatchById(matchId) {
    const api = getApi()
    const { data } = await api.get(`/${matchId}`)
    return data
  },

  async fetchGenralStats() {
    const api = getApi()
    const { data } = await api.get('/generalStats')
    return data
  },

  async getLastMatchesStats() {
    const api = getApi()
    const { data } = await api.get('/lastStats')
    console.log('getLastMatchesStats', data)
    return data.data
  }
};