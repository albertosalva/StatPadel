import { createApp } from 'vue'
import App from './App.vue'

// Importamos el router
import router from './router';

// Importamos axios
import axios from 'axios';

// Importamos Pinia
import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persistedstate';

const pinia = createPinia()
pinia.use(piniaPersist);

// Importar el store de autenticación
import { useAuthStore } from './stores/authStore'

// Configurar interceptor global de Axios
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            if (error.response.data.message === 'El token ha expirado') {
                // NO SE USA EL LOCALSTORAGE
                // Limpiar token y username de localStorage
                //localStorage.removeItem('token');
                //localStorage.removeItem('username');

                // Obtener la instancia del store y limpiar el estado
                const authStore = useAuthStore()
                authStore.logout()
                // Redirigir al login
                router.push({ name: 'Login' });
            }
        }
      return Promise.reject(error);
    }
);


createApp(App).use(pinia).use(router).mount('#app')
