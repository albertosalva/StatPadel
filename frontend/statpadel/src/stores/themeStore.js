// src/stores/themeStore.js
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: false
  }),

  actions: {
    initTheme() {
      const saved = localStorage.getItem('isDark')
      if (saved !== null) {
        this.isDark = saved === 'true'
      } else {
        this.isDark = document.documentElement.classList.contains('dark')
      }

      document.documentElement.classList.toggle('dark', this.isDark)
    },
    toggleTheme() {
      this.isDark = !this.isDark
      localStorage.setItem('isDark', this.isDark)
      document.documentElement.classList.toggle('dark', this.isDark)
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'theme',
        storage: localStorage
      }
    ]
  }
})