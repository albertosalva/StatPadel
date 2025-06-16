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
import {Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { computed, defineProps} from 'vue'

import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)

Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Filler)

// Props
const props = defineProps({
  players: {
    type: Object,
    required: true
  }
})

// Computed properties
const labels = computed(() => Object.keys(props.players))

const positionLabels = {
  top_left: 'Arriba izquierda',
  top_right: 'Arriba derecha',
  bottom_left: 'Abajo izquierda',
  bottom_right: 'Abajo derecha'
}

const playerLabels = computed(() =>
  labels.value.map(id => {
    const name = props.players[id]?.name
    return !name || name === id
      ? positionLabels[id] || id
      : name
  })
)



const distanciaData = computed(() => ({
  labels: playerLabels.value,
  datasets: [
    {
      label: 'Distancia (m)',
      backgroundColor: '#67C23A',
      data: labels.value.map(id => props.players[id].total_distance.toFixed(2))
    }
  ]
}))

const velMediaData = computed(() => ({
  labels: playerLabels.value,
  datasets: [
    {
      label: 'Velocidad media (m/s)',
      backgroundColor: '#E6A23C',
      data: labels.value.map(id => props.players[id].average_speed.toFixed(2))
    }
  ]
}))

const velMaximaData = computed(() => ({
  labels: playerLabels.value,
  datasets: [
    {
      label: 'Velocidad máxima (m/s)',
      backgroundColor: '#F56C6C',
      data: labels.value.map(id => props.players[id].max_speed.toFixed(2))
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: cssVars.value.textColor
      }
    }
    
  },
  scales: {
    x: {
      ticks: {
        color: cssVars.value.textColor
      },
      grid: {
        color:  cssVars.value.gridColor
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: cssVars.value.textColor
      },
      grid: {
        color: cssVars.value.gridColor
      }
    }
  }
}))

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
  flex-direction: row;
  gap: 20px;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 20px;
}

.chart-card {
  flex: 1 1 30%;
  min-width: 300px;
  max-width: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: auto;
}

.chart-card canvas {
  height: 250px !important;
  max-height: 250px !important;
  background-color: transparent;
}

</style>
