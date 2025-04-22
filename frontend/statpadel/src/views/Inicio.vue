<!-- src/views/Inicio.vue -->
<template>
  <div class="home-container">
    <!-- Encabezado con logo y botones -->
    <header class="header">
      <div class="logo">
        <!-- Asegúrate de colocar el logo en la carpeta "src/assets" -->
        <img src="@/assets/logoSP.png" alt="Logo" />
      </div>
      <div class="header-buttons">
        <!-- Usamos router-link para navegar a las rutas de login y registro -->
        <router-link to="/login" class="btn">Iniciar Sesión</router-link>
        <router-link to="/registro" class="btn">Registrarse</router-link>
      </div>
    </header>

    <!-- Contenido principal: texto a la izquierda y foto a la derecha -->
    <main class="main-content">
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
      <div class="image-section">
        <!-- Asegúrate de tener la imagen en "src/assets" o usa una URL externa -->
        <img src="@/assets/man-playing-padel.jpg" alt="Imagen de inicio" />
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: "InicioView",
};
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Encabezado */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  /* Puedes agregar un fondo si lo deseas */
  background-color: #f5f5f5;
}

.logo img {
  height: 75px; /* Ajusta según tus necesidades */
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 15px;
  background-color: #007bff;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #0056b3;
}

/* Contenido principal */
.main-content {
  flex: 1;
  display: flex;
  padding: 20px;
  gap: 20px;
}

.text-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.image-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-section img {
  max-width: 100%;
  height: auto;
}
</style>
