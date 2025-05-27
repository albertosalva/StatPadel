<!-- src/views/GestionarVideos.vue -->
<template>
  <div class="gestionar-videos">
    <h2>Gestionar mis partidos</h2>

    <!-- Botón para crear un nuevo partido -->
    <div class="actions">
      <button @click="onCreate" class="btn-primary">
        + Subir nuevo vídeo
      </button>
    </div>

    <!-- Estado de carga / error -->
    <div v-if="matchStore.loading" class="loading">Cargando partidos…</div>
    <div v-if="matchStore.error" class="error">Error: {{ matchStore.error }}</div>

    <!-- Tabla de partidos -->
    <table v-if="!matchStore.loading && matchStore.matches.length" class="matches-table">
      <thead>
        <tr>
          <th>Vídeo</th>
          <th>Fecha de subida</th>
          <th class="actions-col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in matchStore.matches" :key="m._id">
          <td>
            <div v-if="matchStore.editingId === m._id">
              <input v-model="matchStore.editingName" />
            </div>
            <div v-else>
              {{ m.videoName }}
            </div>
          </td>
          <td>{{ formatDate(m.uploadDate) }}</td>
          <td class="actions-col">
            <div v-if="matchStore.editingId === m._id">
              <button @click="matchStore.saveEdit(m._id)" class="btn-sm">Guardar</button>
              <button @click="matchStore.cancelEdit()" class="btn-sm">Cancelar</button>
            </div>
            <div v-else>
              <button @click="matchStore.startEdit(m)" class="btn-sm">Editar</button>
              <button @click="matchStore.deleteMatch(m._id)" class="btn-sm btn-danger">Eliminar</button>
              <button @click="onStats(m._id)" class="btn-sm btn-secondary">Estadísticas</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Mensaje cuando no hay partidos -->
    <div v-if="!matchStore.loading && !matchStore.matches.length" class="empty">
      No tienes ningún partido subido todavía.
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchStore } from '@/stores/matchStore'

const matchStore = useMatchStore()
const router     = useRouter()

// Formatea fechas
const formatDate = iso => new Date(iso).toLocaleString()

// Carga los partidos al montar
onMounted(() => {
  matchStore.fetchMatches()
})

// Navegar a subida de vídeo
const onCreate = () => {
  router.push({ name: 'SubidaVideo' })
}

// Navegar a estadísticas
const onStats = id => {
  router.push({ name: 'ResultadosEstadisticas', params: { id } })
}
</script>

<style scoped>
.gestionar-videos {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.gestionar-videos h2 {
  margin-bottom: 1rem;
  color: #333;
}

.actions {
  margin-bottom: 1rem;
}

.btn-primary {
  background-color: #007bff;
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary:hover {
  background-color: #0056b3;
}

.matches-table {
  width: 100%;
  border-collapse: collapse;
}
.matches-table th,
.matches-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
  text-align: left;
}
.matches-table th.actions-col,
.matches-table td.actions-col {
  text-align: center;
}

.btn-sm {
  margin-right: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #007bff;
  background: #fff;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
}
.btn-sm:hover {
  background: #007bff;
  color: #fff;
}

.btn-danger {
  border-color: #dc3545;
  color: #dc3545;
}
.btn-danger:hover {
  background: #dc3545;
  color: #fff;
}

.loading,
.error,
.empty {
  text-align: center;
  margin: 2rem 0;
  color: #666;
}
.error {
  color: #dc3545;
}
</style>
