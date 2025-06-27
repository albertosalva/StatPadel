<script>
/**
 * @module    components/HeatMap
 * @component HeatMap
 * @description
 * Componente que muestra un mapa de calor de posiciones de golpeo en la pista de pádel.
 *
 * @prop {Object} match                             - Datos del partido.
 * @prop {Object} match.heatmap            - Objeto con dos props: <br>
 *                                                    • cell_size: tamaño de celda (m)  <br>
 *                                                    • heatmap:   datos del mapa (un objeto de arrays por posición).
 * @prop {Object} match.playerPositions             - Mapa de posición a info de jugador (nombre, etc.).
 */
</script>

<template>
  <el-container direction="vertical" class="heatmap-wrapper">
    
    <!-- Checkbox de "Todos los jugadores" -->
    <el-row>
      <el-col :span="24">
        <el-checkbox v-model="checkAll" :indeterminate="isIndeterminate"  @change="handleCheckAllChange">
          Todos los jugadores
        </el-checkbox>
      </el-col>
    </el-row>

    <!-- Checkboxes individuales en fila -->
    <el-row :gutter="10" class="players-row">
      <el-col v-for="p in playerOptions" :key="p.value" :xs="12" :sm="12" :md="12"
        :lg="12" :span="6" class="player-col">
        <el-checkbox-group v-model="selectedPlayers" @change="handleSelectedPlayersChange">
          <el-checkbox :value="p.value" >
            {{ p.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-col>
    </el-row>

    <!-- Mapa de calor -->
    <el-main class="heatmap-area">
      <div class="heatmap-container">
        <canvas ref="canvasRef" class="heatmap-canvas"></canvas>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, onMounted, defineProps, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix'
import 'chartjs-chart-matrix'

const props = defineProps({
  match: {
    type: Object,
    required: true
  }
})

// Dimensiones de la pista de pádel (en metros)
const width = 10
const height = 20


// Datos del heatmap
const heatmapData = ref(null)
const canvasRef = ref(null)

const playerOptions = ref([])

// Selección de jugadores
const selectedPlayers = ref([])
const checkAll = ref(true)
const isIndeterminate = ref(false)

// Nombres de posiciones si el jugador no tiene nombre
const positionLabels = {
  top_left:     'Arriba izquierda',
  top_right:    'Arriba derecha',
  bottom_left:  'Abajo izquierda',
  bottom_right: 'Abajo derecha'
}

// Pista de pádel personalizada
const padelCourtLines = {
  id: 'padelCourtLines',
  beforeDraw(chart) {
    const enabled = chart.config.options.plugins?.padelCourtLines?.enabled
    if (!enabled) return

    const { ctx, chartArea } = chart
    const { left, top, width, height } = chartArea

    ctx.save()

    // Pintar fondo verde
    ctx.fillStyle = '#006400'
    ctx.fillRect(left, top, width, height)

    // Pintar líneas blancas
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    // Funciones para convertir coordenadas reales (en metros) a píxeles
    const toX = x => left + (x / 10) * width 
    const toY = y => top + (y / 20) * height 

    // Contorno de pista
    ctx.strokeRect(toX(0), toY(0), toX(10) - toX(0), toY(20) - toY(0))

    // Línea de red
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(10))
    ctx.lineTo(toX(10), toY(10))
    ctx.stroke()

    // Líneas de servicio 
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(10 - 6.5))
    ctx.lineTo(toX(10), toY(10 - 6.5))
    ctx.moveTo(toX(0), toY(10 + 6.5))
    ctx.lineTo(toX(10), toY(10 + 6.5))
    ctx.stroke()

    // Línea central vertical 
    ctx.beginPath()
    ctx.moveTo(toX(5), toY(10 - 6.5))
    ctx.lineTo(toX(5), toY(10 + 6.5))
    ctx.stroke()

    ctx.restore()
  }
}
Chart.register(...registerables, MatrixController, MatrixElement, padelCourtLines)

// Cargar opciones de jugadores desde las posiciones
function loadPlayerOptions(playerPositions) {
  playerOptions.value = Object.entries(playerPositions).map(([positionKey, player]) => {
    return {
      value: positionKey,
      label: player?.name
        ? player.name
        : (positionLabels[positionKey] || positionKey)
    }
  })
  //ordenar las posiciones de jugadores para mostrarlas en el orden correcto
  .sort((a, b) => {
      const order = ['top_left','top_right','bottom_left','bottom_right']
      return order.indexOf(a.value) - order.indexOf(b.value)
    })
  selectedPlayers.value = playerOptions.value.map(p => p.value)
}

// Manejo de cambios en el checkbox "Todos los jugadores"
const handleCheckAllChange = (val) => {
  selectedPlayers.value = val ? [...playerOptions.value.map(p => p.value)] : []
  isIndeterminate.value = false
  renderHeatmap()
}

// Manejo de cambios en los checkboxes individuales
const handleSelectedPlayersChange = (value) => {
  const count = value.length
  checkAll.value = count === playerOptions.value.length
  isIndeterminate.value = count > 0 && count < playerOptions.value.length
  renderHeatmap()
}

// Combinar datos de múltiples jugadores
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

// Renderizar el heatmap
function renderHeatmap() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvasRef.value.getContext('2d')
  const existingChart = Chart.getChart(ctx)
  if (existingChart) {
    existingChart.destroy()
  }
  
  const { heatmap, cell_size } = heatmapData.value
  const selected = selectedPlayers.value

  let matrix
  if (!selected.length) {
    matrix = []
  } else {
    // Filtrar el heatmap por los jugadores seleccionados
    const filteredHeatmap = Object.fromEntries(Object.entries(heatmap).filter(([key]) => selected.includes(key)))
    matrix = combinePlayers(filteredHeatmap)
  }
  
  // Preparar los datos para el gráfico
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
        padelCourtLines: { enabled: true }
      }
    }
  })
}

onMounted(async () => {
  try {
    const match =  props.match
    if (!match || !match.heatmap) {
      return
    }

    heatmapData.value = match.heatmap
    loadPlayerOptions(match.playerPositions)
    // Esperamos para asgurar esta cargado el canvas
    await nextTick()

    renderHeatmap()
  } catch (err) {
    console.error("Error al obtener datos", err)
  }
})
</script>

<style scoped>
.heatmap-wrapper {
  display: flex; flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
}

.players-row { margin: 10px 0 20px }
.player-col { display: flex; align-items: center }

.heatmap-area {
  display: flex;
  justify-content: center;
  align-items: center;
  height: auto;
  max-height: 80vh;
  width: 100%;
  min-width: 0;
  overflow: hidden; 
}

.heatmap-container {
  position: relative;
  aspect-ratio: 1 / 2;
  width: 100%;
  max-width: calc(80vh / 2);
  height: auto;
  max-height: 80vh;
  overflow: hidden; 
}

/* Canvas de fondo (pista) */
.court-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

/* Contenedor del heatmap.js sobre la pista */
.heatmap-court {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
}


@media (max-aspect-ratio: 1/2) {
  .heatmap-area{
    height:auto;            /* deja de forzar 80 vh                */
    flex:0 0 auto;
    align-items:flex-start; /* elimina el “hueco” arriba/abajo     */
  }

  .heatmap-container{
    max-width:none;         /* ya no la limitamos en ancho         */
    max-height:none;        /* permite que el alto se auto-ajuste  */
  }
}


</style>