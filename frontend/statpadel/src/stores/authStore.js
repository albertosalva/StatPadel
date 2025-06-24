import { defineStore } from 'pinia'
import { loginService, registerService, updateProfileService, deleteUser } from '@/services/userService';

// Definimos el store de autenticación
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null,
        username: '',
        email: '',
        userId:  null,
        level: null,
        avatarPath: null
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
        getUsername: (state) => state.username || "Usuario",
        getEmail: (state) => state.email,
        getUserId: state => state.userId,
        getAvatarPath: state => state.avatarPath,
        getLevel: state => state.level
    },
    actions: {
        async login(username, password) {
            // Llamar a la función de login del servicio de usuarios
            const { token, userId,  username: userName, email: email, avatarPath, level: level } = await loginService(username, password);

            console.log('Login exitoso:', { token, userId, userName, email, avatarPath, level });
            
            // Guardar el token y el nombre de usuario en el store
            this.token = token
            this.username = userName
            this.email = email
            this.userId   = userId
            this.avatarPath = avatarPath
            this.level = level
        },
        async register(nombre, email, password, confirmPassword, level) {
            // Llama al servicio de registro y retorna la respuesta.
            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return await registerService(nombre, email, password, level);
        },
        logout() {
            this.token = null
            this.username = ''
            this.email = ''
            this.userId   = null
        },
        async updateProfile(payload) {
            const formData = new FormData()

            if (payload.name)
                formData.append('name', payload.name)
            if (payload.email)
                formData.append('email', payload.email)
            if (payload.currentPassword)
                formData.append('currentPassword', payload.currentPassword)
            if (payload.newPassword)
                formData.append('newPassword', payload.newPassword)
            if (payload.level)
                formData.append('level', payload.level)
            if (payload.avatarFile)
                formData.append('avatar', payload.avatarFile)

            console.log('[Store] Actualizando perfil con:', formData)

            const updated = await updateProfileService(formData)

            console.log('[Store] Resultado:', updated)

            if (updated.username) 
                this.username = updated.username
            if (updated.email)    
                this.email = updated.email
            if (updated.avatar) {
                this.avatarPath = `${updated.avatar}?t=${Date.now()}`
            }
            if (updated.level) 
                this.level = updated.level
        },
        async deleteAccount() {
            await deleteUser()
            this.logout()
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
