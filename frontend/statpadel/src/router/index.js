// src/router/index.js

// Importamos las funciones necesarias para crear el router
import { createRouter, createWebHistory } from 'vue-router';

// Importamos jwtDecode
import { jwtDecode } from "jwt-decode";

// Importamos el store de autenticación
import { useAuthStore } from '@/stores/authStore';

const routes = [
  { path: '/', name: 'Inicio', component: () => import('../views/InicioView.vue'), meta: { requiresAuth: false } },
  { path: '/registro', name: 'Registro', component: () => import('../views/RegistroView.vue'), meta: { requiresAuth: false } },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { requiresAuth: false } },
  { path: '/principal', name: 'Principal', component: () => import('../views/PrincipalView.vue'), meta: { requiresAuth: true } },
  { path: '/subida-video', name: 'SubidaVideo', component: () => import('../views/SubidaVideo.vue'), meta: { requiresAuth: true } },
  { path: '/procesamiento-video', name: 'ProcesamientoVideo', component: () => import('../views/ProcesamientoVideo.vue'), meta: { requiresAuth: true } },
  { path: '/resultados-estadisticas/:id', name: 'ResultadosEstadisticas', component: () => import('../views/ResultadosEstadisticas.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/gestion-videos', name: 'GestionVideos', component: () => import('../views/GestionVideos.vue'), meta: { requiresAuth: true } },
  { path: '/configuracion-perfil', name: 'ConfiguracionPerfil', component: () => import('../views/ConfiguracionPerfil.vue'), meta: { requiresAuth: true } },
  { path: '/ayuda', name: 'Ayuda', component: () => import('../views/Ayuda.vue'), meta: { requiresAuth: false } },
  {
    path: '/heatmap/:id',
    name: 'HeatMap',
    component: () => import('../components/HeatMap.vue'),
    meta: { requiresAuth: true },
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  // Si la ruta no requiere autenticación, permitirla
  if (!to.meta.requiresAuth) {
    return next();
  }
  
  const authStore = useAuthStore();
  if (authStore.token) {
    try {
      const decoded = jwtDecode(authStore.token);
      const now = Date.now() / 1000; // Tiempo en segundos
      if (decoded.exp && decoded.exp > now) {
        // Token válido, permitir el acceso
        return next();
      } else {
        // Token expirado
        //localStorage.removeItem('token');
        //localStorage.removeItem('username');
        authStore.logout();
        return next({ name: 'Login' });
      }
    } catch (err) {
      // Error al decodificar el token, redirigir a Login
      //localStorage.removeItem('token');
      //localStorage.removeItem('username');
      authStore.logout();
      return next({ name: 'Login' });
    }
  } else {
    // No hay token, redirigir a Login
    return next({ name: 'Login' });
  }
});

export default router;
