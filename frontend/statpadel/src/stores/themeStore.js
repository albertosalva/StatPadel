// src/stores/themeStore.js
/**
 * @module stores/themeStore
 * @description
 * Pinia store para gestionar el tema de la aplicación (claro/oscuro), 
 * con persistencia en localStorage y getters para colores CSS dinámicos.
 */

import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  /**
   * @typedef {Object} ThemeState
   * @property {boolean} isDark  Indica si el modo oscuro está activo.
   */
  state: () => ({
    isDark: false
  }),
  getters: {
    textColor: (state) => {
      void state.isDark
      return getCssVar('--el-text-color-primary')
    },
    gridColor: (state) => {
      void state.isDark
      return getCssVar('--el-border-color')
    },
    logoSrc: (state) => {
      return state.isDark
        ? require('@/assets/logoSP.png')
        : require('@/assets/logoSP-dark.png')
    }
  },
  actions: {
    /**
     * @method initTheme
     * @description
     * Inicializa el tema según valor guardado en localStorage o clase <html>.
     * Sin parámetros, actualiza la clase `dark` del documento.
     */
    initTheme() {
      const saved = localStorage.getItem('isDark')
      if (saved !== null) {
        this.isDark = saved === 'true'
      } else {
        this.isDark = document.documentElement.classList.contains('dark')
      }

      document.documentElement.classList.toggle('dark', this.isDark)
    },
    /**
     * @method toggleTheme
     * @description
     * Alterna entre tema claro y oscuro, persiste en localStorage
     * y actualiza la clase `dark` del documento.
     */
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

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}