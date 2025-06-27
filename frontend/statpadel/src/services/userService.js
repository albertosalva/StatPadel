/**
 * @module services/userService
 * @description
 * Controlador para la gestión de usuarios:
 * <ul>
 *   <li><code>loginService</code>: inicia sesión y devuelve token + datos de perfil.</li>
 *   <li><code>registerService</code>: registra un nuevo usuario.</li>
 *   <li><code>comprobarExistencia</code>: verifica si un nombre de usuario ya existe.</li>
 *   <li><code>updateProfileService</code>: actualiza datos de perfil, contraseña y avatar.</li>
 *   <li><code>deleteUser</code>: elimina la cuenta del usuario autenticado.</li>
 *   <li><code>buscarUsuarios</code>: busca usuarios por prefijo de nombre y devuelve sugerencias.</li>
 * </ul>
 */

import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/stores/authStore'


/**
 * Crea una instancia de Axios con el token JWT en la cabecera de Authorization.
 * @returns {AxiosInstance} Instancia de Axios configurada para rutas de usuario.
 */
function getApi() {
  const auth = useAuthStore()
  const base = axios.defaults.baseURL
  return axios.create({
    baseURL: `${base}/api/users`,
    headers: { Authorization: `Bearer ${auth.token}` }
  })
}


/**
 * Inicia sesión autenticando al usuario con `username` y `password`.
 *
 * @async
 * @function loginService
 * @param   {string} username       Nombre de usuario.
 * @param   {string} password       Contraseña.
 * @returns {Promise<{
 *   token: string,
 *   userId: string,
 *   username: string,
 *   email: string,
 *   avatarPath: string,
 *   level: string
 * }>}                        Objeto con el JWT (`token`) y datos del usuario.
 * @throws  {Error}               Si la petición al servidor falla o devuelve error.
 */
export const loginService = async (username, password) => {
  // Llamar al endpoint de login
  try {
    const {data} = await axios.post('/api/auth/login', {username, password})
    const {token, userId: apiUserId, username: userName, email: email , avatarPath: avatarPath, level: level} = data

    let userId = apiUserId
    if (!userId) {
      // Decodifica el JWT para sacar el sub
      const payload = jwtDecode(token)
      userId = payload.sub
    }
    return { token, userId, username: userName, email: email, avatarPath,level}
  }
  catch (error) {
    console.error('Error en el servicio de login:', error)
    throw error
  }
}


/**
 * Registra un nuevo usuario en la plataforma.
 *
 * @async
 * @function registerService
 * @param   {string} nombre       Nombre completo del usuario.
 * @param   {string} email        Correo electrónico.
 * @param   {string} password     Contraseña.
 * @param   {string} level        Nivel de habilidad.
 * @returns {Promise<any>}        Respuesta de la API tras el registro.
 * @throws  {Error}               Si la petición al servidor falla o devuelve error.
 */
export const registerService = async (nombre, email, password, level) => {
  try {
    const response = await axios.post('/api/auth/register', {
      nombre,
      email,
      password,
      level
    });
    return response.data
  }
  catch (error) {
    console.error('Error en el servicio de registro:', error)
    throw error
  }
}


/**
 * Comprueba si un nombre de usuario ya existe.
 *
 * @async
 * @function comprobarExistencia
 * @param   {string} username     Nombre de usuario a verificar.
 * @returns {Promise<boolean>}    `true` si existe ya, `false` en caso contrario.
 * @throws  {Error}               Si la petición al servidor falla o devuelve error.
 */
export const comprobarExistencia = async (username) => {
  const api = getApi()
  try {
      const response = await api.post(`/check`, {username})
      //console.log("Respuesta recibida:", response.data)
      return response.data; 
    } catch (error) {
      console.error('[userService] Error comprobando usuario:', error)
      throw error
    }
}


/**
 * Actualiza el perfil del usuario autenticado.
 *
 * @async
 * @function updateProfileService
 * @param   {FormData} payload    FormData con campos a actualizar.
 * @returns {Promise<any>}        Datos actualizados del usuario.
 * @throws  {Error}               Si la petición al servidor falla o la API devuelve un mensaje de error.
 */
export const updateProfileService = async (payload) => {
  const api = getApi()
  try {
    const { data } = await api.put('/update', payload)
    //console.log('[userService] updateProfileService response:', data)
    return data
  } catch (error) {
    console.error('[userService] Error en updateProfileService:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw error
  }
}


/**
 * Elimina la cuenta del usuario autenticado y sus datos asociados.
 *
 * @async
 * @function deleteUser
 * @returns {Promise<void>}       Se resuelve si la eliminación fue exitosa.
 * @throws  {Error}               Si la petición al servidor falla o la API devuelve un mensaje de error.
 */
export const deleteUser = async () => {
  const api = getApi()
  try {
    await api.delete('/delete')
    //console.log('[userService] deleteUser: User deleted successfully')
  } catch (error) {
    console.error('[userService] Error deleting user:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw error
  }
}


/**
 * Busca hasta 4 usuarios cuyo nombre empiece por la cadena `query`.
 *
 * @async
 * @function buscarUsuarios
 * @param   {string} query        Cadena a buscar al inicio de los nombres.
 * @returns {Promise<Array<{ 
 *   value: string,
 *   label: string,
 *   avatarUrl: string
 * }>>}                       Array con hasta 4 coincidencias.
 * @throws  {Error}               Si la petición al servidor falla o devuelve error.
 */
export const buscarUsuarios = async (query) => {
  const api = getApi()
  const name = (query || '').trim()
  if (!name) {
    return []
  }

  //console.log('[userService] buscando usuarios con nombre:', name)
  try {
    const { data } = await api.get(`/search`, {
      params: { name: name }
    })
    //console.log('[userService] Usuarios encontrados:', data)
    return data
  } catch (error) {
    console.error('[userService] Error buscando usuarios:', error)
    throw error
  }
}