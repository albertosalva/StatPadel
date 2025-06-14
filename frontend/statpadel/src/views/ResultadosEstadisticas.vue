<template>
  <el-container class="estadisticas-container">
    <AppHeader/>

    <el-main>
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
        <el-row :gutter="20">
          <!-- Vídeo -->
          <el-col :xs="24" :md="8">
            <el-card shadow="hover">
              <template #header>
                <span>Vídeo del partido</span>
              </template>
              <video
                v-if="videoUrl"
                controls
                style="width: 100%; border-radius: 8px"
                :src="videoUrl"
              />
            </el-card>
          </el-col>



          <!-- Mapa de calor -->
          <el-col :xs="24" :md="6">
            <el-card shadow="hover">
              <template #header>
                <span>Mapa de calor</span>
              </template>
              <HeatMap :match-id="matchId"/>
            </el-card>
          </el-col>
        </el-row>

          <!-- Bola -->
          <el-col :xs="24" :md="2">
            <el-card shadow="hover">
              <template #header>
                <span>Estadísticas de la Bola</span>
              </template>
              <BallStatsChart v-if="match?.analysis?.ball" :stats="match.analysis.ball" />
            </el-card>
          </el-col>        

        <!-- Jugadores -->
        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="24">
            <el-card shadow="hover">
              <template #header>
                <span>Estadísticas de los jugadores</span>
              </template>
              <JugadoresEstadisticas v-if="match?.analysis?.players" :players="match.analysis.players" />
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


</script>

<style scoped>
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

/* ======================== */
/* Video player */
/* ======================== */
video {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
