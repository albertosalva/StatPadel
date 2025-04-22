<template>
  <div class="login-container">
    <h2>Iniciar Sesión</h2>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">Correo Electrónico:</label>
        <input type="text" id="email" v-model="username" required />
      </div>
      <div class="form-group">
        <label for="password">Contraseña:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" class="btn">Ingresar</button>
    </form>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { useAuthStore  } from '@/stores/authStore';

export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      errorMessage: ''
    };
  },
  created() {
    this.authStore = useAuthStore();
  },
  methods: {
    async handleLogin() {
      try {
        await this.authStore.login(this.username, this.password);
        alert('Inicio de sesión exitoso');
        this.$router.push('/principal');
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.btn {
  display: block;
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  margin-top: 15px;
  color: red;
  text-align: center;
}
</style>
