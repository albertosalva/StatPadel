import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/stores/authStore'

// Crea una instancia de Axios con el token ya incluido
function getApi() {
  const auth = useAuthStore()
  const base = axios.defaults.baseURL
  return axios.create({
    baseURL: `${base}/api/users`,
    headers: { Authorization: `Bearer ${auth.token}` }
  })
}

// Función para iniciar sesión
export const loginService = async (username, password) => {
  // Llamar al endpoint de login
  try {
    const {data} = await axios.post('/api/auth/login', {username, password});
    const {token, userId: apiUserId, username: userName, email: email } = data

    let userId = apiUserId
    if (!userId) {
      // Decodifica el JWT para sacar el sub
      const payload = jwtDecode(token)
      userId = payload.sub
    }
    return { token, userId, username: userName, email: email }
  }
  catch (error) {
    console.error('Error en el servicio de login:', error);
    throw error; 
  }
};


// Función para registrar un usuario
export const registerService = async (nombre, email, password) => {
  try {
    const response = await axios.post('/api/auth/register', {
      nombre,
      email,
      password,
    });
    return response.data;
  }
  catch (error) {
    console.error('Error en el servicio de registro:', error);
    throw error; 
  }
};

// Funcion para ver si el usuario existe
export const comprobarExistencia = async (username) => {
  //console.log("📡 Llamando a backend con usuario:", username)
  try {
      const response = await axios.post(`/api/users/check`, {username});
      //console.log("📬 Respuesta recibida:", response.data)
      return response.data; 
    } catch (error) {
      console.error('[❌ userService] Error comprobando usuario:', error);
      throw error;
    }
}


export const updateProfileService = async (payload) => {
  const api = getApi()
  try {
    const { data } = await api.put('/update', payload)
    console.log('[userService] updateProfileService response:', data)
    return data
  } catch (error) {
    console.error('[userService] Error en updateProfileService:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw error
  }
}



export const deleteUser = async () => {
  const api = getApi()
  try {
    await api.delete('/delete')
    console.log('[userService] deleteUser: User deleted successfully')
  } catch (error) {
    console.error('[userService] Error deleting user:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw error
  }
}