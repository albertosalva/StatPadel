<template>
  <el-container direction="vertical" class="heatmap-wrapper">
    
    <!-- Checkbox de "Todos los jugadores" -->
    <el-row>
      <el-col :span="24">
        <el-checkbox
          v-model="checkAll"
          :indeterminate="isIndeterminate"
          @change="handleCheckAllChange"
        >
          Todos los jugadores
        </el-checkbox>
      </el-col>
    </el-row>

    <!-- Checkboxes individuales en fila -->
    <el-row :gutter="10" class="players-row">
      <el-col
        v-for="p in playerOptions"
        :key="p.value"
        :xs="12"
        :span="6"
        class="player-col"
        @change="handleSelectedPlayersChange"
      >
        <el-checkbox
          :label="p.value"
          v-model="selectedPlayers"
        >
          {{ p.label }}
        </el-checkbox>
      </el-col>
    </el-row>

    <!-- Mapa de calor -->
    <el-main class="heatmap-area">
      <div class="heatmap-container">
        <canvas ref="canvasRef"></canvas>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, onMounted, nextTick, defineProps } from 'vue'
import { useRoute } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix'
import 'chartjs-chart-matrix'
import matchService from '@/services/matchService'

defineProps({
  matchId: String
})

Chart.register(...registerables, MatrixController, MatrixElement)
Chart.register({
  id: 'padelCourtLines',
  beforeDraw(chart) {
    const { ctx, chartArea } = chart
    const { left, top, width, height } = chartArea

    ctx.save()

    // 🎨 Pintar fondo verde
    ctx.fillStyle = '#006400' // Verde oscuro tipo pista
    ctx.fillRect(left, top, width, height)

    // ⚪ Pintar líneas blancas
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    // Funciones para convertir coordenadas reales (en metros) a píxeles
    const toX = x => left + (x / 10) * width 
    const toY = y => top + (y / 20) * height 

    // 🟥 Contorno de pista
    ctx.strokeRect(toX(0), toY(0), toX(10) - toX(0), toY(20) - toY(0))

    // 🟥 Línea de red
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(10))
    ctx.lineTo(toX(10), toY(10))
    ctx.stroke()

    // 🟥 Líneas de servicio 
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(10 - 6.5))
    ctx.lineTo(toX(10), toY(10 - 6.5))
    ctx.moveTo(toX(0), toY(10 + 6.5))
    ctx.lineTo(toX(10), toY(10 + 6.5))
    ctx.stroke()

    // 🟥 Línea central vertical 
    ctx.beginPath()
    ctx.moveTo(toX(5), toY(10 - 6.5))
    ctx.lineTo(toX(5), toY(10 + 6.5))
    ctx.stroke()

    ctx.restore()
  }
})


const route = useRoute()
const matchId = route.params.id

const heatmapData = ref(null)
const canvasRef = ref(null)

const width = 10
const height = 20


const playerOptions = ref([])

function loadPlayerOptions(playerPositions) {
  playerOptions.value = Object.entries(playerPositions).map(([positionKey, player]) => {
    return {
      value: positionKey,
      label: player?.name || positionKey
    }
  })
  selectedPlayers.value = playerOptions.value.map(p => p.value)
}

const selectedPlayers = ref([])
const checkAll = ref(true)
const isIndeterminate = ref(false)

const handleCheckAllChange = (val) => {
  selectedPlayers.value = val ? [...playerOptions.value.map(p => p.value)] : []
  isIndeterminate.value = false
  renderHeatmap()
}

const handleSelectedPlayersChange = (value) => {
  const count = value.length
  checkAll.value = count === playerOptions.value.length
  isIndeterminate.value = count > 0 && count < playerOptions.value.length
  renderHeatmap()
}


function combinePlayers(data) {
  const combined = new Map()

  for (const playerMatrix of Object.values(data)) {
    for (const cell of playerMatrix) {
      const key = `${cell.row}-${cell.col}`
      if (!combined.has(key)) {
        combined.set(key, { ...cell }) 
      } else {
        combined.get(key).value += cell.value
      }
    }
  }

  return Array.from(combined.values())
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


  
  const { heatmap, cell_size } = heatmapData.value
  const selected = selectedPlayers.value

  let matrix
  if (!selected.length) {
    matrix = []
  } else {
    const filteredHeatmap = Object.fromEntries(Object.entries(heatmap).filter(([key]) => selected.includes(key)))
    matrix = combinePlayers(filteredHeatmap)
  }
  

  const data = matrix.map(cell => ({
    x: cell.col * cell_size + cell_size / 2,
    y: cell.row * cell_size + cell_size / 2,
    v: cell.value,
    width: cell_size,
    height: cell_size
  }))

  new Chart(ctx, {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Mapa de calor',
        data,
        backgroundColor: ctx => {
          const item = ctx.dataset.data[ctx.dataIndex]
          if (!item) return 'rgba(0, 0, 0, 0)'
          const v = item.v
          return `rgba(255, 0, 0, ${Math.min(v / 100, 1)})`
        },
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, 
      animation: false,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: width,
          ticks: {display: false},
          grid: { display: false }
        },
        y: {
          type: 'linear',
          min: 0,
          max: height,
          ticks: {display: false},
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Recuento: ${ctx.raw.v}`
          }
        },
        padelCourtLines: {}
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
    loadPlayerOptions(match.playerPositions)
    console.log("✅ Datos de heatmap recibidos:", Object.keys(heatmapData.value))

    await nextTick() // 💡 Espera a que el canvas se renderice

    renderHeatmap()
  } catch (err) {
    console.error("❌ Error al obtener datos de MongoDB:", err)
  }
})
</script>

<style scoped>
.heatmap-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  box-sizing: border-box;
}

.players-row {
  margin: 10px 0 20px;
}

.player-col {
  display: flex;
  align-items: center;
}

.heatmap-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  max-height: 80vh;
  overflow: hidden;
}

/* contenedor que impone proporción 1:2 */
.heatmap-container {
  aspect-ratio: 1 / 2;
  height: 100%;
  width: auto;
  max-height: 100%;
  max-width: 100%;
}

/* el canvas se adapta al contenedor */
canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>


