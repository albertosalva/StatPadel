<script>
/**
 * @module    components/UltimosPartidosStats
 * @component UltimosPartidosStats
 * @description
 * Componente que muestra tres gráficos de barras con estadísticas de los últimos partidos de un jugador:<br>
 * - Distancia total recorrida (m).  <br>
 * - Velocidad media (m/s).  <br>
 * - Velocidad máxima (m/s). 
 */ 
</script>

<template>
  <div class="jugadores-stats">
    <el-card class="chart-card" shadow="hover">
      <h3>Distancia total recorrida (m)</h3>
      <Bar :data="distanciaData" :options="chartOptions" />
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <h3>Velocidad media (m/s)</h3>
      <Bar :data="velMediaData" :options="chartOptions" />
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <h3>Velocidad máxima (m/s)</h3>
      <Bar :data="velMaximaData" :options="chartOptions" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { useMatchStore } from '@/stores/matchStore'
import { useThemeStore } from '@/stores/themeStore'

// Registrar componentes de Chart.js
Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// Store y estado reactivo
const matchStore = useMatchStore()
const lastMatchesStats = computed(() => matchStore.lastMatchesStats)

// Tema para colores dinámicos
const themeStore = useThemeStore()
//const isDark = computed(() => themeStore.isDark)

// Carga datos al montar
onMounted(() => {
  matchStore.loadLastMatchesStats()
})

// Etiquetas: usa el nombre o la fecha del partido
const labels = computed(() =>
  lastMatchesStats.value.map(m => m.matchName || formatDate(m.matchDate))
)

// Datos para los gráficos
const distanciaData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Distancia (m)',
    backgroundColor: '#67C23A',
    data: lastMatchesStats.value.map(m => m.stats.distance ?? 0)
  }]
}))

const velMediaData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Velocidad media (m/s)',
    backgroundColor: '#E6A23C',
    data: lastMatchesStats.value.map(m => m.stats.avgSpeed ?? 0)
  }]
}))

const velMaximaData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Velocidad máxima (m/s)',
    backgroundColor: '#F56C6C',
    data: lastMatchesStats.value.map(m => m.stats.maxSpeed ?? 0)
  }]
}))

// Opciones de configuración del gráfico
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: themeStore.textColor }
    }
  },
  scales: {
    x: {
      ticks: { color: themeStore.textColor },
      grid:  { color: themeStore.gridColor }
    },
    y: {
      beginAtZero: true,
      ticks: { color: themeStore.textColor },
      grid:  { color: themeStore.gridColor }
    }
  }
}))

// Función para formatear fechas
function formatDate(dateString) {
  return dateString
    ? new Date(dateString).toLocaleDateString()
    : '—'
}

</script>

<style scoped>
.jugadores-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
}
.chart-card {
  flex: 1 1 30%;
  min-width: 280px;
  padding: 16px;
  box-sizing: border-box;
  height: 320px;
}
.chart-card h3 {
  margin-bottom: 12px;
  font-size: 1.1rem;
}
.chart-card canvas {
  height: 220px !important;
}
</style>
