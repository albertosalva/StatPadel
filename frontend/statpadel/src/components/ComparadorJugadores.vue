<template>
    <div>
        <el-row :gutter="20" class="mb-4">
      <el-col :span="12">
        <el-select v-model="selected1" placeholder="Jugador 1" style="width: 100%">
          <el-option
            v-for="(data, key) in players"
            :key="key"
            :label="getPlayerLabel(key)"
            :value="key"
            :disabled="key === selected2"
          />
        </el-select>
      </el-col>

      <el-col :span="12">
        <el-select v-model="selected2" placeholder="Jugador 2" style="width: 100%">
          <el-option
            v-for="(data, key) in players"
            :key="key"
            :label="getPlayerLabel(key)"
            :value="key"
            :disabled="key === selected1"
          />
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

onMounted(() => {
  const ids = Object.keys(props.players)
  if (ids.length >= 2) {
    selected1.value = ids[0]
    selected2.value = ids.find(id => id !== ids[0]) || null
  }
})

const positionLabels = {
  top_left: 'Arriba izquierda',
  top_right: 'Arriba derecha',
  bottom_left: 'Abajo izquierda',
  bottom_right: 'Abajo derecha'
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

const selected1 = ref(null)
const selected2 = ref(null)

function getPlayerLabel(id) {
  const name = props.players[id]?.name
  return !name || name === id ? positionLabels[id] || id : name
}

const radarData = computed(() => {
  const jugadorIds = Object.keys(props.players)
  if (jugadorIds.length < 2) return null

  if (!selected1.value || !selected2.value) return null

  const j1 = props.players[selected1.value]
  const j2 = props.players[selected2.value]

  const maxValues = {
    total_distance: Math.max(j1.total_distance, j2.total_distance),
    average_speed: Math.max(j1.average_speed, j2.average_speed),
    max_speed: Math.max(j1.max_speed, j2.max_speed)
  }

  return {
    labels: ['Distancia', 'Vel. media', 'Vel. máxima'],
    datasets: [
      {
        label: getPlayerLabel(selected1.value),
        data: [
          normalizar(j1.total_distance, maxValues.total_distance),
          normalizar(j1.average_speed, maxValues.average_speed),
          normalizar(j1.max_speed, maxValues.max_speed)
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      },
      {
        label: getPlayerLabel(selected2.value),
        data: [
          normalizar(j2.total_distance, maxValues.total_distance),
          normalizar(j2.average_speed, maxValues.average_speed),
          normalizar(j2.max_speed, maxValues.max_speed)
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  }
})

function normalizar(val, max) {
  return val / max
}

const radarOptions = computed(() => {
  const { textColor, gridColor } = cssVars.value

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor
        }
      },
      title: {
        display: true,
        text: 'Comparativa de jugadores',
        color: textColor
      }
    },
    scales: {
      r: {
        angleLines: { color: gridColor },
        grid: { color: gridColor },
        pointLabels: { color: textColor },
        ticks: { display: false }
      }
    }
  }
})
</script>