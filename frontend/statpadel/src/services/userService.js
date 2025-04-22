import axios from 'axios';

// Configuración global de Axios: todas las peticiones se dirigirán a http://localhost:3000
axios.defaults.baseURL = 'http://localhost:3000';

// Función para iniciar sesión
export const loginService = async (username, password) => {
  // Llamar al endpoint de login
  try {
    const response = await axios.post('/api/auth/login', {
      username,
      password,
    });
    return response.data;
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

