<template>
  <el-container class="estadisticas-container">
    <AppHeader/>

    <el-main style="padding: 0 10vw">
      <h2>Estadísticas del partido</h2>

      <div v-if="loading">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="error">
        <el-alert type="error" :title="error" show-icon />
      </div>

      <div v-else-if="!match.analysis">
        <el-empty description="Este partido aún no tiene estadísticas." />
      </div>

      <div v-else>
        <el-row style="margin-top: 20px">
          <el-col :span="24">
            <el-card shadow="hover">
              <template #header>👥 Jugadores del partido</template>
              <JugadoresImagen :players="playerOverview" />
            </el-card>
          </el-col>
        </el-row>
      
      <el-row :gutter="20" style="margin-top: 20px" class="estadisticas-layout">
        <!-- Columna izquierda -->
        <el-col :xs="24" :md="16" class="estadisticas-col">
          <div class="estadisticas-col-inner">
            <el-card shadow="hover">
              <template #header>🎥 Vídeo</template>
              <video
                v-if="videoUrl"
                controls
                style="width: 100%; border-radius: 8px"
                :src="videoUrl"
              />
            </el-card>

            <el-card shadow="hover" class="expand-card">
              <template #header>👥 Comparador</template>
              <ComparadorJugadores v-if="playerStats" :players="playerStats"/>
            </el-card>
          </div>
        </el-col>

        <!-- Columna derecha -->
        <el-col :xs="24" :md="8" class="estadisticas-col">
          <div class="estadisticas-col-inner">
            <el-card shadow="hover">
              <template #header>🔥 Mapa de calor</template>
              <HeatMap :match="match"/>
            </el-card>

            <el-card shadow="hover" class="expand-card">
              <template #header>🎾 Estadísticas de bola</template>
              <BallStatsChart v-if="ballStats" :stats="ballStats"/>
            </el-card>
          </div>
        </el-col>
      </el-row>

        <!-- Fila completa abajo: Otras estadísticas -->
        <el-row style="margin-top: 20px">
          <el-col :span="24">
            <el-card shadow="hover">
              <template #header>📊 Estadísticas de los jugadores</template>
              <JugadoresEstadisticas v-if="playerStats" :players="playerStats" />
            </el-card>
          </el-col>
        </el-row>



        
      </div>
    </el-main>


    <AppFooter/>

  </el-container>

</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import BallStatsChart from '@/components/BolaEstadisticas.vue'
import JugadoresEstadisticas from '@/components/JugadoresEstadisticas.vue'
import HeatMap from '@/components/HeatMap.vue'
import ComparadorJugadores from '@/components/ComparadorJugadores.vue'
import JugadoresImagen from '@/components/JugadoresImagen.vue'


import { onMounted, ref, computed} from 'vue'
import { useRoute } from 'vue-router'
import matchService from '@/services/matchService'
import axios from 'axios'

const route = useRoute()
const match = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const id = route.params.id
    match.value = await matchService.getMatchById(id)
    console.log('MATCH:', match.value)
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
})

const videoUrl = computed(() => {
  const url = match.value?.videoPath ? `${axios.defaults.baseURL}${match.value.videoPath}` : ''
  console.log('VIDEO URL:', url)
  return url
})

// 📊 Estadísticas de la bola (formato esperado por <BolaEstadisticas>)
const ballStats = computed(() => {
  const analysis = match.value?.analysis
  if (!analysis?.distances?.ball || !analysis?.avgSpeeds?.ball || !analysis?.maxSpeeds?.ball) {
    return null
  }
  return {
    total_distance: analysis.distances.ball,
    average_speed: analysis.avgSpeeds.ball,
    max_speed: analysis.maxSpeeds.ball
  }
})


const playerStats = computed(() => {
  const analysis = match.value?.analysis
  const playerInfo = match.value?.playerPositions || {}
  
  if (!analysis?.distances || !analysis?.avgSpeeds || !analysis?.maxSpeeds) 
    return null

  // Solo incluir jugadores comunes a los tres conjuntos
  const jugadores = Object.keys(analysis.distances).filter(id =>
    id !== 'ball' &&
    analysis.avgSpeeds[id] !== undefined &&
    analysis.maxSpeeds[id] !== undefined
  )

  const stats = {}
  for (const id of jugadores) {
    stats[id] = {
      name: playerInfo[id]?.name || id,
      total_distance: analysis.distances[id],
      average_speed: analysis.avgSpeeds[id],
      max_speed: analysis.maxSpeeds[id]
    }
  }

  console.log('Player Stats:', stats)
  return stats
})

const playerOverview = computed(() => {
  const pp = match.value?.playerPositions || {}
  // Lo convertimos en un array de { id, name, avatarPath }
  return Object.entries(pp)
    .filter(([, p]) => p != null)
    .map(([id, p]) => ({
      id,
      name:       p.name,
      avatarPath: p.avatarPath
    }))
})

</script>

<style scoped>

.estadisticas-layout {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  align-items: stretch;
}

.estadisticas-col {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.estadisticas-col-inner {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  flex: 1;
}

/* Solo aplicar altura igualada en escritorio */
@media (min-width: 768px) {
  .estadisticas-col-inner {
    height: 100%;
  }
}

.expand-card {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.estadisticas-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}


/* ======================== */
/* Estilos para títulos */
/* ======================== */
h2 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 20px;
  color: var(--el-color-primary);
  text-align: center;
}

/* ======================== */
/* Contenedores y tarjetas */
/* ======================== */
.el-card {
  border-radius: 12px;
  flex:0 0 auto;
  transition: box-shadow 0.3s ease;
}


.el-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

/* ======================== */
/* Gráficas de jugadores */
/* ======================== */
.jugadores-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
}

.chart-card {
  flex: 1 1 30%;
  min-width: 280px;
  max-width: 100%;
  padding: 20px;
  height: 300px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.chart-card canvas {
  height: 220px !important;
  max-height: 220px !important;
}

/* ======================== */
/* Responsive */
/* ======================== */
@media (max-width: 768px) {
  .jugadores-stats {
    flex-direction: column;
  }

  .chart-card {
    height: auto;
    min-height: 300px;
  }

  video {
    max-height: 250px;
  }
}

:deep(.heatmap-card .el-card__body){
  padding:0;
}

/* ======================== */
/* Video player */
/* ======================== */
video {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
