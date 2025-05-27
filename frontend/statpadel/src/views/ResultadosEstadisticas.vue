<template>
  <div class="estadisticas-partido">
    <h2>Estadísticas del partido</h2>

    <div v-if="loading" class="loading">Cargando estadísticas…</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else-if="!match.analysis" class="empty">Este partido aún no tiene estadísticas.</div>
    <div v-else>
      <h3>Jugadores</h3>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Distancia total (m)</th>
            <th>Vel. media (m/s)</th>
            <th>Vel. máxima (m/s)</th>
            <th>Puntos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(data, playerId) in match.analysis.players" :key="playerId">
            <td>{{ playerId }}</td>
            <td>{{ data.total_distance.toFixed(2) }}</td>
            <td>{{ data.average_speed.toFixed(2) }}</td>
            <td>{{ data.max_speed.toFixed(2) }}</td>
            <td>{{ data.n_points }}</td>
          </tr>
        </tbody>
      </table>

      <h3>Bola</h3>
      <ul>
        <li>Distancia total: {{ match.analysis.ball.total_distance.toFixed(2) }} m</li>
        <li>Velocidad media: {{ match.analysis.ball.average_speed.toFixed(2) }} m/s</li>
        <li>Velocidad máxima: {{ match.analysis.ball.max_speed.toFixed(2) }} m/s</li>
        <li>Puntos: {{ match.analysis.ball.n_points }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const match = ref(null)
const loading = ref(true)
const error = ref(null)

import matchService from '@/services/matchService'

onMounted(async () => {
  try {
    const id = route.params.id
    match.value = await matchService.getMatchById(id)
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.estadisticas-partido {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h2, h3 {
  color: #333;
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}
table th, table td {
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
  text-align: center;
}

.loading, .error, .empty {
  text-align: center;
  margin: 2rem 0;
}
.error {
  color: red;
}
</style>
