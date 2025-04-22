<template>
    <div class="login-container">
      <h2>Iniciar Sesión</h2>
      <form @submit.prevent="handleLogin">
        <div>
          <label for="email">Correo Electrónico:</label>
          <input type="email" id="email" v-model="email" required />
        </div>
        <div>
          <label for="password">Contraseña:</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit">Ingresar</button>
      </form>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </template>
  
  <script>
  export default {
    name: "UserLogin",
    data() {
      return {
        email: "",
        password: "",
        errorMessage: ""
      };
    },
    methods: {
      handleLogin() {
        // Aquí puedes agregar una validación real o llamar a una API
        if (this.email === "user@example.com" && this.password === "123456") {
          alert("Inicio de sesión exitoso");
          // Aquí podrías redirigir al usuario o guardar el estado de autenticación
        } else {
          this.errorMessage = "Credenciales incorrectas";
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .login-container {
    max-width: 400px;
    margin: auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
  .login-container h2 {
    text-align: center;
  }
  .login-container div {
    margin-bottom: 15px;
  }
  .login-container label {
    display: block;
    margin-bottom: 5px;
  }
  .login-container input {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
  }
  .login-container .error {
    color: red;
    text-align: center;
  }
  </style>
  