/**
 * @module    stores/authStore
 * @description
 * Store de autenticación que gestiona el estado y la lógica de usuario:
 * <ul>
 *   <li>Token, datos de perfil y avatar.</li>
 *   <li>Login, registro, actualización de perfil y cierre de sesión.</li>
 *   <li>Getters para acceso reactivo a nombre, email, nivel y URLs de avatar.</li>
 * </ul>
 */

import { defineStore } from 'pinia'
import axios from 'axios';
import { loginService, registerService, updateProfileService, deleteUser } from '@/services/userService';

// Definimos el store de autenticación
export const useAuthStore = defineStore('auth', {
    /**
     * @typedef {Object} AuthState
     * @property {string|null} token         JWT de sesión.
     * @property {string}      username      Nombre de usuario.
     * @property {string}      email         Email del usuario.
     * @property {string|null} userId        ID único del usuario.
     * @property {string|null} level         Nivel de juego (Principiante, etc.).
     * @property {string|null} avatarPath    Ruta al avatar en el servidor.
     */
    state: () => ({
        token: null,
        username: '',
        email: '',
        userId:  null,
        level: null,
        avatarPath: null
    }),
    getters: {
        isAuthenticated: state => !!state.token,
        getUsername: state => state.username || "Usuario",
        getEmail: state => state.email,
        getUserId: state => state.userId,
        getAvatarPath: state => state.avatarPath,
        getAvatarURL: state => {
            return state.avatarPath
                ? `${axios.defaults.baseURL}${state.avatarPath}`
                : ''
        },
        getLevel: state => state.level,
        getUserAvatarURL: () => (path) => {
            return path
                ? `${axios.defaults.baseURL}${path}`
                : ''
        }
    },
    actions: {
        /**
         * @method login
         * @description
         * Inicia sesión: llama al servicio, recibe token y datos de usuario,
         * y los almacena en el store.
         *
         * @param {string} username  Nombre de usuario o email.
         * @param {string} password  Contraseña en texto plano.
         * @returns {Promise<void>}
         */
        async login(username, password) {
            // Llamar a la función de login del servicio de usuarios
            const { token, userId,  username: userName, email: email, avatarPath, level: level } = await loginService(username, password);

            //console.log('Login exitoso:', { token, userId, userName, email, avatarPath, level });
            
            // Guardar el token y el nombre de usuario en el store
            this.token = token
            this.username = userName
            this.email = email
            this.userId   = userId
            this.avatarPath = avatarPath
            this.level = level
        },
        /**
         * @method register
         * @description
         * Registra un nuevo usuario.
         *
         * @param {string} nombre
         * @param {string} email
         * @param {string} password
         * @param {string} confirmPassword
         * @param {string} level
         * @throws {Error} Si las contraseñas no coinciden.
         */
        async register(nombre, email, password, confirmPassword, level) {
            // Llama al servicio de registro y retorna la respuesta.
            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return await registerService(nombre, email, password, level);
        },
        /** 
         * @method logout
         * @description
         * Cierra la sesión limpiando el estado.
         */
        logout() {
            this.token = null
            this.username = ''
            this.email = ''
            this.userId   = null
        },
        /** 
         * @method updateProfile
         * @description
         * Actualiza el perfil del usuario (datos y avatar).
         * @param {Object} payload
         * @param {string} [payload.name]
         * @param {string} [payload.email]
         * @param {string} [payload.currentPassword]
         * @param {string} [payload.newPassword]
         * @param {string} [payload.level]
         * @param {File}   [payload.avatarFile]
         */
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

            //console.log('[Store] Actualizando perfil con:', formData)

            const updated = await updateProfileService(formData)

            //console.log('[Store] Resultado:', updated)

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
        /** 
         * @method deleteAccount
         * @description
         * Elimina la cuenta del usuario y cierra sesión.
         */
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
