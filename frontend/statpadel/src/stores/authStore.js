import { defineStore } from 'pinia'
import { loginService, registerService } from '@/services/userService';

// Definimos el store de autenticación
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null,
        username: '',
        userId:  null
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
        getUsername: (state) => state.username || "Usuario",
        getUserId: state => state.userId
    },
    actions: {
        async login(username, password) {
            // Llamar a la función de login del servicio de usuarios
            const { token, userId,  username: userName } = await loginService(username, password);
            
            // Guardar el token y el nombre de usuario en el store
            this.token = token;
            this.username = userName;
            this.userId   = userId

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
            this.userId   = null
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
