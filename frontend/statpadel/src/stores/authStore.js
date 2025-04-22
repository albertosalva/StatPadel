import { defineStore } from 'pinia'
import { loginService, registerService } from '@/services/userService';

// Definimos el store de autenticación
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null,
        username: ''
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
        getUsername: (state) => state.username || "Usuario"
    },
    actions: {
        async login(username, password) {
            // Llamar a la función de login del servicio de usuarios
            const { token, username: userName } = await loginService(username, password);
            
            // Guardar el token y el nombre de usuario en el store
            this.token = token;
            this.username = userName;
        },
        async register(nombre, email, password, confirmPassword) {
            // Llama al servicio de registro y retorna la respuesta.
            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return await registerService(nombre, email, password);
        },
        logout() {
            this.token = null
            this.username = ''
        }
    }, 
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'auth',      
                storage: localStorage, 
            },
        ],
    },
})
