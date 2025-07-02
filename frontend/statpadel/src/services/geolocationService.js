/**
 * @module services/geolocationService
 * @description
 * Cliente para la gestión de geolocalización:
 * <ul>
 *   <li><code>autocompleteAddress</code>: obtiene sugerencias de direcciones.</li>
 *   <li><code>geocodeAddress</code>: convierte una dirección en coordenadas.</li>
 * </ul>
 */

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

/**
 * Crea una instancia de Axios con el token JWT y la baseURL de geolocalización.
 * @returns {import('axios').AxiosInstance}
 */
function getGeoApi() {
  const { token } = useAuthStore()
  return axios.create({
    baseURL: `${axios.defaults.baseURL}/api/geolocation`,
    headers: { Authorization: `Bearer ${token}` }
  })
}

/**
 * Autocompleta direcciones con sugerencias.
 *
 * @async
 * @function autocompleteAddress
 * @param   {string} input  Texto de búsqueda parcial de la dirección.
 * @returns {Promise<Array<{ description: string, placeId: string }>>}
 * @throws  {Error}        Si la respuesta tiene formato inesperado o la petición falla.
 */
export const autocompleteAddress = async input => {
  if (!input || !input.trim()) {
    console.warn('[geolocationService] input vacío')
    return []
  }
  try {
    const api = getGeoApi()
    const response = await api.get('/autocomplete', { params: { input } })
    const { predictions } = response.data
    if (!Array.isArray(predictions)) {
      console.error('[geolocationService] Formato inesperado en autocomplete:', response.data)
      throw new Error('Formato inesperado en autocomplete')
    }
    return predictions.map(p => ({
      description: p.description,
      placeId:     p.place_id
    }))
  } catch (error) {
    console.error('[geolocationService] Error en autocompleteAddress:', error)
    throw error
  }
}

/**
 * Geocodifica una dirección a coordenadas.
 *
 * @async
 * @function geocodeAddress
 * @param   {string} address  Dirección completa a convertir.
 * @returns {Promise<{ formatted: string, lat: number, lng: number, placeId: string, raw: object }>>}
 * @throws  {Error}          Si no se reciben datos válidos o la petición falla.
 */
export const geocodeAddress = async address => {
  if (!address || !address.trim()) {
    throw new Error('Dirección vacía')
  }
  try {
    const api = getGeoApi()
    const response = await api.get('/geocode', { params: { address } })
    const data = response.data
    const { formatted, lat, lng, placeId, raw } = data
    if (!formatted || typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('[geolocationService] Datos inválidos de geocode:', data)
      throw new Error('Datos de geocodificación inválidos')
    }
    return { formatted, lat, lng, placeId, raw }
  } catch (error) {
    console.error('[geolocationService] Error en geocodeAddress:', error)
    throw error
  }
}