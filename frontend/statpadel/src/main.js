/**
 * @module main
 * @description
 * Punto de entrada de la aplicación Vue.<br>
 * Configura Vue, Pinia (con persistencia), Vue Router, Element Plus, axios y el modo oscuro.
 */

// Importamos Vue y el componente raíz
import { createApp } from 'vue';
import App from './App.vue';

// Importamos el router
import router from './router';

// Importamos axios
import axios from 'axios';
const host = process.env.VUE_APP_API_HOST;
const port = process.env.VUE_APP_API_PORT;
//console.log('[ENV] axios.baseURL:', `http://${host}:${port}`);
axios.defaults.baseURL = `http://${host}:${port}`;

// Importamos element-plus
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import ElementPlus from 'element-plus';
import esLocale from 'element-plus/es/locale/lang/es';
import 'dayjs/locale/es';

// Importamos Pinia
import { createPinia } from 'pinia';
import piniaPersist from 'pinia-plugin-persistedstate';

const pinia = createPinia();
pinia.use(piniaPersist);

// Importar el store de autenticación
import { useAuthStore } from './stores/authStore';

// Configurar interceptor global de Axios
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            if (error.response.data.message === 'El token ha expirado') {
                // Obtener la instancia del store y limpiar el estado
                const authStore = useAuthStore();
                authStore.logout();
                // Redirigir al login
                router.push({ name: 'Login' });
            }
        }
      return Promise.reject(error);
    }
);


createApp(App).use(pinia).use(router).use(ElementPlus, { locale: esLocale }).mount('#app');

// Configurar el modo oscuro
document.documentElement.classList.add('dark');