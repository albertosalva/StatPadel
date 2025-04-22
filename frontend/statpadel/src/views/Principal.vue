<template>
  <div class="home-container">
    <!-- Encabezado con logo y nombre del usuario -->
    <header class="header">
      <div class="logo">
        <img src="@/assets/logoSP.png" alt="Logo" />
      </div>
      <div class="user-info" @click="toggleDropdown">
        <span>{{ username }}</span>
        <div v-if="dropdownVisible" class="dropdown-menu">
          <button class="dropdown-btn" @click.stop="configPerfil">Configuración de perfil</button>
          <button class="dropdown-btn" @click.stop="cerrarSesion">Cerrar sesión</button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div class="buttons">
        <button class="btn btn-upload" @click="subirVideo">
          <i class="icon-upload"></i> Subir Video
        </button>
        <button class="btn btn-list" @click="verVideos">
          <i class="icon-list"></i> Lista de Videos
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import { useAuthStore } from '@/stores/authStore';


export default {
  name: "PrincipalView",
  data() {
    return {
      //username: '',
      dropdownVisible: false,
    };
  },
  created() {
    this.authStore = useAuthStore();
  },
  computed: {
    // Se obtiene el username directamente desde el store,
    // lo que permite que la vista se actualice automáticamente si cambia.
    username() {
      return this.authStore.getUsername;
    }
  },
  methods: {
    toggleDropdown() {
      this.dropdownVisible = !this.dropdownVisible;
    },
    configPerfil() {
      this.dropdownVisible = false;
      this.$router.push("/configuracion-perfil");
    },
    cerrarSesion() {
      this.dropdownVisible = false;
      this.authStore.logout();
      this.$router.push("/");
    },
    subirVideo() {
      this.$router.push("/subida-video");
    },
    verVideos() {
      this.$router.push("/gestion-videos");
    }
  }
};
</script>

<style scoped>
.principal-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4f8, #d9e2ec);
}

/* Encabezado */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background-color: #ffffffcc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo img {
  height: 60px;
}

.user-info {
  position: relative;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}

/* Menú desplegable */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
}

.dropdown-btn {
  width: 100%;
  padding: 10px 15px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  transition: background-color 0.2s;
}

.dropdown-btn:hover {
  background-color: #f0f0f0;
}

/* Contenido principal */
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.buttons {
  display: flex;
  flex-direction: row;
  gap: 20px;
  justify-content: center;
}

.btn {
  padding: 15px 25px;
  font-size: 18px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;
}

.btn-upload {
  background: linear-gradient(45deg, #28a745, #218838);
}

.btn-upload:hover {
  background: linear-gradient(45deg, #218838, #1e7e34);
}

.btn-list {
  background: linear-gradient(45deg, #007bff, #0069d9);
}

.btn-list:hover {
  background: linear-gradient(45deg, #0069d9, #0056b3);
}
</style>