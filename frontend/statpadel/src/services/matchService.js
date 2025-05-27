// src/services/matchService.js
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

// Crea una instancia de Axios con el token ya incluido
function getApi() {
  const auth = useAuthStore()
  return axios.create({
    baseURL: 'http://localhost:3000/api/matches',
    headers: { Authorization: `Bearer ${auth.token}` }
  })
}

export default {
  // Recupera todos los partidos del usuario logueado 
  async getMyMatches() {
    const api = getApi()
    const { data } = await api.get('/mine')
    return data
  },

  // Elimina un partido por su ID 
  async deleteMatch(matchId) {
    const api = getApi()
    await api.delete(`/${matchId}`)
  },

  // Actualiza solo el nombre de un partido 
  async updateMatch(matchId, newName) {
    const api = getApi()
    const { data } = await api.put(`/${matchId}`, { videoName: newName })
    return data
  },

  // Recupera un partido por su ID
  async getMatchById(matchId) {
    const api = getApi()
    const { data } = await api.get(`/${matchId}`)
    return data
  }
}

