<script>
/**
 * @module    views/ResultadosEstadisticas
 * @component ResultadosEstadisticas
 * @description
 * Muestra las estadísticas de un partido de pádel: 
 * <ul>
 *   <li>Jugadores del partido con sus imágenes.</li>
 *   <li>Vídeo del partido.</li>
 *   <li>Comparador de estadísticas de jugadores.</li>
 *   <li>Mapa de calor de posiciones de golpeo.</li>
 *   <li>Estadísticas de la bola.</li>
 *   <li>Tabla de estadísticas de los jugadores.</li>
 * </ul>
*/
</script>

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

      <div v-else-if="match && !match.analysis">
        <el-empty description="Este partido aún no tiene estadísticas." />
      </div>

      <div v-else-if="match && match.analysis">
        <el-row v-if="playerOverview.length" style="margin-top: 20px">
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
              <video v-if="videoUrl" controls style="width: 100%; border-radius: 8px" :src="videoUrl" />
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
              <HeatMap v-if="match" :match="match"/>
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


import { onMounted, computed} from 'vue'
import { useRoute } from 'vue-router'
import { useMatchStore } from '@/stores/matchStore'

//import axios from 'axios'

const matchStore = useMatchStore()
const route = useRoute()

// Al montar el componente, obtenemos el ID del partido desde la ruta y cargamos los datos del partido
onMounted(() => {
  matchStore.fetchMatch(route.params.id)
})

// Obtenemos los datos del partido desde el store
const match     = computed(() => matchStore.currentMatch)
const loading   = computed(() => matchStore.loading)
const error     = computed(() => matchStore.error)

// URL del vídeo del partido
const videoUrl = computed(() => matchStore.getVideoURL)


// Estadísticas de la bola 
const ballStats = computed(() => matchStore.getBallStats)

// Estadísticas de los jugadores
const playerStats = computed(() => matchStore.getPlayerStats)

const playerOverview = computed(() => matchStore.getPlayerOverview)

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
