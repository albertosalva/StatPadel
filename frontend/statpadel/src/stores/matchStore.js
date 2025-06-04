// src/stores/matchStore.js
import { defineStore } from 'pinia'
import matchService from '@/services/matchService'

export const useMatchStore = defineStore('match', {
  state: () => ({
    matches: [],
    loading: false,
    error: null,
    editingId: null,
    editingName: ''
  }),
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
      this.editingName = match.videoName
    },
    cancelEdit() {
      this.editingId = null
    },
    async saveEdit(id) {
      try {
        const updated = await matchService.updateMatch(id, this.editingName)
        const idx = this.matches.findIndex(m => m._id === id)
        if (idx !== -1) this.matches[idx].videoName = updated.videoName
        this.editingId = null
      } catch (err) {
        alert(err.response?.data?.error || err.message)
      }
    }
  }
})
