<script>
/**
 * @module    components/CompradorJugadores
 * @component CompradorJugadores
 * @description
 * Componente que muestra un gráfico de radar comparativo de dos jugadores. <br>
 * Permite seleccionar “Jugador 1” y “Jugador 2” para comparar sus estadísticas: <br>
 * - Distancia total recorrida.  <br>
 * - Velocidad media.  <br>
 * - Velocidad máxima.
 *
 * @prop {Object[]} players                   - Array de objetos con información de los jugadores.
 * @prop {string}   players[].name             - Nombre del jugador o etiqueta de posición.
 * @prop {number}   players[].total_distance   - Distancia total recorrida en metros.
 * @prop {number}   players[].average_speed    - Velocidad media en metros por segundo.
 * @prop {number}   players[].max_speed        - Velocidad máxima en metros por segundo.
 */
</script>


<template>
    <div>
        <el-row :gutter="20" class="mb-4">
      <el-col :span="12">
        <el-select v-model="selected1" placeholder="Jugador 1" style="width: 100%">
          <el-option v-for="(data, key) in players" :key="key" :label="getPlayerLabel(key)" 
          :value="key" :disabled="key === selected2"/>
        </el-select>
      </el-col>

      <el-col :span="12">
        <el-select v-model="selected2" placeholder="Jugador 2" style="width: 100%">
          <el-option v-for="(data, key) in players" :key="key" :label="getPlayerLabel(key)"
            :value="key" :disabled="key === selected1"/>
        </el-select>
      </el-col>
    </el-row>

    <div style="height: 500px" v-if="radarData">
      <Radar :data="radarData" :options="radarOptions" />
    </div>
    </div>
</template>

<script setup>
import {Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js'
import {Radar } from 'vue-chartjs'
import { computed, defineProps, ref, onMounted} from 'vue'
import { useThemeStore } from '@/stores/themeStore'

// Importamos el store de tema
const themeStore = useThemeStore()
//const isDark = computed(() => themeStore.isDark)

// Registramos los componentes de Chart.js
Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Filler)

// Props
const props = defineProps({
  players: {
    type: Object,
    required: true
  }
})

// Seleccionamos los jugadores por defecto
onMounted(() => {
  const ids = Object.keys(props.players)
  if (ids.length >= 2) {
    selected1.value = ids[0] || null
    selected2.value = ids.find(id => id !== ids[0]) || null
  }
})

const positionLabels = {
  top_left: 'Arriba izquierda',
  top_right: 'Arriba derecha',
  bottom_left: 'Abajo izquierda',
  bottom_right: 'Abajo derecha'
}


// Variables reactivas para los jugadores seleccionados
const selected1 = ref(null)
const selected2 = ref(null)

// Función para obtener el nombre o la etiqueta del jugador
function getPlayerLabel(id) {
  const name = props.players[id]?.name
  return !name || name === id ? positionLabels[id] || id : name
}

const maximosCalculados = computed(() => {
  const jugadores = Object.values(props.players)

  return {
    total_distance: Math.max(...jugadores.map(p => p.total_distance || 0)),
    average_speed: Math.max(...jugadores.map(p => p.average_speed || 0)),
    max_speed: Math.max(...jugadores.map(p => p.max_speed || 0))
  }
})

// Normaliza un valor entre 0 y 1 basado en el máximo proporcionado
function normalizar(val, max) {
  return val / max
}

// Datos para el gráfico radar
const radarData = computed(() => {
  const jugadorIds = Object.keys(props.players)
  if (jugadorIds.length < 2) return null

  if (!selected1.value || !selected2.value) return null

  const j1 = props.players[selected1.value]
  const j2 = props.players[selected2.value]

  return {
    labels: ['Distancia', 'Vel. media', 'Vel. máxima'],
    datasets: [
      {
        label: getPlayerLabel(selected1.value),
        data: [
          normalizar(j1.total_distance, maximosCalculados.value.total_distance),
          normalizar(j1.average_speed, maximosCalculados.value.average_speed),
          normalizar(j1.max_speed, maximosCalculados.value.max_speed)
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      },
      {
        label: getPlayerLabel(selected2.value),
        data: [
          normalizar(j2.total_distance, maximosCalculados.value.total_distance),
          normalizar(j2.average_speed, maximosCalculados.value.average_speed),
          normalizar(j2.max_speed, maximosCalculados.value.max_speed)
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  }
})

// Opciones del gráfico radar
const radarOptions = computed(() => {

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: themeStore.textColor
        }
      },
      title: {
        display: true,
        text: 'Comparativa de jugadores',
        color: themeStore.textColor
      },
      tooltip: {
				callbacks: {
					label: ctx => {
						const label = ctx.dataset.label || ''
						const valorNormalizado = ctx.raw
						const index = ctx.dataIndex

						const metricaKeyMap = ['total_distance', 'average_speed', 'max_speed']
						const metrica = metricaKeyMap[index]

						const valorReal = (
							valorNormalizado * maximosCalculados.value[metrica]
						).toFixed(2)

						const unidades = {
							total_distance: 'm',
							average_speed: 'm/s',
							max_speed: 'm/s'
						}

						return `${label}: ${valorReal} ${unidades[metrica]}`
					}
				}
			}
    },
    scales: {
      r: {
        min: 0,
        max: 1,
        angleLines: { color: themeStore.gridColor },
        grid: { color: themeStore.gridColor },
        pointLabels: { color: themeStore.textColor, font: { size: 12 } },
        ticks: { display: false }
      }
    }
  }
})


</script>