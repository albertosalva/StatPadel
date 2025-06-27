<!-- src/App.vue -->
<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
/**
 * @module App
 * @component App
 * @description
 * Componente raíz de la aplicación Vue. <br>
 * Se encarga únicamente de renderizar la vista activa según la ruta.
 */
  export default {
    name: 'App',
  };
</script>

<style>
/* Estilos globales de la aplicación */
nav {
  padding: 10px;
  background-color: #f5f5f5;
}
nav a {
  margin-right: 10px;
  text-decoration: none;
  color: #333;
}
</style>
