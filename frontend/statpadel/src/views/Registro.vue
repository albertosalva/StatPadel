<template>
  <div class="register-container">
    <h2>Registrarse</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label for="nombre">Nombre:</label>
        <input type="text" id="nombre" v-model="username" required />
      </div>
      <div class="form-group">
        <label for="correo">Correo Electrónico:</label>
        <input type="email" id="correo" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Contraseña:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">Repetir Contraseña:</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" required />
      </div>
      <button type="submit" class="btn">Registrarse</button>
    </form>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { useAuthStore  } from '@/stores/authStore';

export default {
  name: 'RegisterView',
  data() {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      errorMessage: ''
    };
  },
  created() {
    this.authStore = useAuthStore();
  },
  methods: {
    async handleRegister() {
      try {
        //await registerService(this.nombre, this.correo, this.password, this.confirmPassword, this.$router);
        await this.authStore.register(this.username, this.email, this.password, this.confirmPassword);
        alert('Registro exitoso');
        this.$router.push('/login');
      } catch (error) {
        this.errorMessage = error.message || "Error en el registro";
      }
    }
  }
};
</script>

<style scoped>
.register-container {
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
