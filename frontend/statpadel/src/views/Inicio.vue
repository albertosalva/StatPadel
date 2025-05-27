<!-- src/views/Inicio.vue -->
<template>
  <el-container class="home-container">
    <!-- Header -->
    <el-header class="header">
      <div class="logo">
        <el-image
          :src="require('@/assets/logoSP.png')"
          alt="Logo StatPadel"
          fit="contain"
          style="height: 75px;"
        />
      </div>
      <div class="header-buttons">
        <router-link to="/login">
          <el-button type="primary">Iniciar Sesión</el-button>
        </router-link>
        <router-link to="/registro">
          <el-button type="success">Registrarse</el-button>
        </router-link>
      </div>
    </el-header>

    <!-- Main content -->
    <el-main class="main-content">
      <el-row :gutter="24" align="middle">
        <!-- Texto -->
        <el-col :span="24" :md="12">
          <div class="text-section">
            <h1>Bienvenido a StatPadel</h1>
            <p>
              En StatPadel transformamos la forma en que gestionas y analizas
              tus videos deportivos. Nuestra plataforma te permite subir tus
              videos, procesarlos para extraer insights clave y obtener
              estadísticas precisas que te ayudarán a mejorar el rendimiento
              de tu equipo. Descubre una experiencia integral que te acompaña
              desde el primer clic hasta el análisis detallado de cada jugada.
            </p>
          </div>
        </el-col>

        <!-- Imagen -->
        <el-col :span="24" :md="12">
          <div class="image-section">
            <el-image
              :src="require('@/assets/man-playing-padel.jpg')"
              alt="Jugador de pádel"
              fit="cover"
              style="max-width: 100%; height: auto;"
            />
          </div>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
export default {
  name: 'InicioView'
}
</script>


<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #fafafa; /* tono ligero por defecto */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-buttons {
  margin-left: 12px;
  display: flex;
  gap: 12px;
}

.main-content {
  padding: 40px 24px;
}

.text-section h1 {
  margin-bottom: 16px;
}

.text-section p {
  line-height: 1.6;
  color: #555;
}
</style>
