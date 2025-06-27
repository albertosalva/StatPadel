<script>
/**
 * @module    components/BolaEstadisticas
 * @component BolaEstadisticas
 * @description
 * Componente que muestra estadísticas de la bola.  <br>
 * - Distancia total recorrida (m).  <br>
 * - Velocidad media (m/s).  <br>
 * - Velocidad máxima (m/s).
 *
 * @prop {Object} stats - Objeto con los datos de la bola.
 * @prop {number} stats.total_distance - Distancia total recorrida por la bola en metros.
 * @prop {number} stats.average_speed - Velocidad media de la bola en metros por segundo.
 * @prop {number} stats.max_speed - Velocidad máxima alcanzada por la bola en metros por segundo.
 */
</script>

<template>
  <el-card shadow="hover" class="bola-stats-card">
    <h3>Estadísticas de la bola</h3>
    <el-row :gutter="20">
      <el-col :span="8">
        <div class="stat-block">
          <i class="el-icon-location-outline stat-icon" />
          <span class="stat-label">Distancia</span>
          <span class="stat-value">{{ props.stats.total_distance.toFixed(2) }} m</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-block">
          <i class="el-icon-cpu stat-icon" />
          <span class="stat-label">Vel. media</span>
          <span class="stat-value">{{ props.stats.average_speed.toFixed(2) }} m/s</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-block">
          <i class="el-icon-upload2 stat-icon" />
          <span class="stat-label">Vel. máxima</span>
          <span class="stat-value">{{ props.stats.max_speed.toFixed(2) }} m/s</span>
        </div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  stats: {
    type: Object,
    required: true
  }
})


</script>

<style scoped>
.bola-stats-card {
  margin-bottom: 20px;
}

.stat-block {
  text-align: center;
  padding: 10px;
}

.stat-icon {
  font-size: 28px;
  color: #409eff;
}

.stat-label {
  display: block;
  font-weight: 500;
  margin-top: 6px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: (--el-text-color-primary);
}
</style>
