<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix'
import 'chartjs-chart-matrix'
import matchService from '@/services/matchService'

Chart.register(...registerables, MatrixController, MatrixElement)

const route = useRoute()
const matchId = route.params.id

const heatmapData = ref(null)
const canvasRef = ref(null)

const width = 10
const height = 20
const player = ref('all')
 // cambiar por jugador individual si hace falta

function combinePlayers(data) {
  const keys = Object.keys(data)
  const rows = data[keys[0]].length
  const cols = data[keys[0]][0].length
  const combined = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (const matrix of Object.values(data)) {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        combined[i][j] += matrix[i][j]
      }
    }
  }

  return combined
}

function renderHeatmap() {
    
  if (!canvasRef.value) {
    console.error("⛔ canvasRef aún no está listo.")
    return
  }

  console.log("🛠 Renderizando heatmap...")

  const ctx = canvasRef.value.getContext('2d')
  const existingChart = Chart.getChart(ctx)
  if (existingChart) existingChart.destroy()
  console.log("🛠 Renderizando heatmap...")

  const matrix = player.value === 'all'
    ? combinePlayers(heatmapData.value)
    : heatmapData.value[player.value]

  const rows = matrix.length
  const cols = matrix[0].length
  const cellWidth = width / cols
  const cellHeight = height / rows

  const data = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = matrix[y][x]
      if (value > 0) {
        data.push({
          x: x * cellWidth + cellWidth / 2,
          y: y * cellHeight + cellHeight / 2,
          v: value,
          width: cellWidth,
          height: cellHeight
        })
      }
    }
  }

  new Chart(ctx, {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Mapa de calor',
        data,
        backgroundColor: ctx => {
          const v = ctx.dataset.data[ctx.dataIndex].v
          return `rgba(255, 0, 0, ${Math.min(v / 100, 1)})`
        },
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: width,
          ticks: { stepSize: 1 }
        },
        y: {
          type: 'linear',
          min: 0,
          max: height,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Recuento: ${ctx.raw.v}`
          }
        }
      }
    }
  })
}

onMounted(async () => {
  console.log("🟡 Cargando heatmap para matchId:", matchId)

  try {
    const match = await matchService.getMatchById(matchId)
    if (!match || !match.heatmap) {
      console.warn("⚠️ No se encontraron datos de heatmap.")
      return
    }

    heatmapData.value = match.heatmap
    console.log("✅ Datos de heatmap recibidos:", Object.keys(heatmapData.value))

    await nextTick() // 💡 Espera a que el canvas se renderice
    renderHeatmap()
  } catch (err) {
    console.error("❌ Error al obtener datos de MongoDB:", err)
  }
})
</script>

<template>
  <div>
    <h2>Mapa de calor</h2>
    <select v-model="player" @change="renderHeatmap">
        <option value="all">Todos los jugadores</option>
        <option value="bottom_left">bottom_left</option>
        <option value="bottom_right">bottom_right</option>
        <option value="top_left">top_left</option>
        <option value="top_right">top_right</option>
    </select>
    <div style="position: relative; width: 500px; height: 1000px;">
      <canvas ref="canvasRef" width="500" height="1000"></canvas>
    </div>
  </div>
</template>
