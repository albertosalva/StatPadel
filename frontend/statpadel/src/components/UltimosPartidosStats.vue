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
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'

// 1) Registrar componentes de Chart.js
Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// 2) Store y estado reactivo
const matchStore = useMatchStore()
const { lastMatchesStats } = storeToRefs(matchStore)

// 3) Tema para colores dinámicos
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)

// 4) Carga datos al montar
onMounted(() => {
  matchStore.loadLastMatchesStats()
})

// 5) Etiquetas: usa el nombre o la fecha del partido
const labels = computed(() =>
  lastMatchesStats.value.map(m => m.matchName || formatDate(m.matchDate))
)

// 6) Datasets para cada métrica
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

// 7) Opciones compartidas
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: cssVars.value.textColor }
    }
  },
  scales: {
    x: {
      ticks: { color: cssVars.value.textColor },
      grid:  { color: cssVars.value.gridColor }
    },
    y: {
      beginAtZero: true,
      ticks: { color: cssVars.value.textColor },
      grid:  { color: cssVars.value.gridColor }
    }
  }
}))

// 8) Helpers
function formatDate(dateString) {
  return dateString
    ? new Date(dateString).toLocaleDateString()
    : '—'
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const cssVars = computed(() => {
  void isDark.value
  return {
    textColor: getCssVar('--el-text-color-primary'),
    gridColor: getCssVar('--el-border-color')
  }
})

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
