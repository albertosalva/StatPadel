import axios from 'axios';
import { jwtDecode } from 'jwt-decode';


// Función para iniciar sesión
export const loginService = async (username, password) => {
  // Llamar al endpoint de login
  try {
    const {data} = await axios.post('/api/auth/login', {username, password});
    const {token, userId: apiUserId, username: userName } = data

    let userId = apiUserId
    if (!userId) {
      // Decodifica el JWT para sacar el sub
      const payload = jwtDecode(token)
      userId = payload.sub
    }
    return { token, userId, username: userName }
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
