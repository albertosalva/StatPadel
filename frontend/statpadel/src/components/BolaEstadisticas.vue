<template>
  <el-card shadow="hover" class="bola-stats-card">
    <h3>Estadísticas de la bola</h3>
    <el-row :gutter="20">
      <el-col :span="8">
        <div class="stat-block">
          <i class="el-icon-location-outline stat-icon" />
          <span class="stat-label">Distancia</span>
          <span class="stat-value">{{ stats.total_distance.toFixed(2) }} m</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-block">
          <i class="el-icon-cpu stat-icon" />
          <span class="stat-label">Vel. media</span>
          <span class="stat-value">{{ stats.average_speed.toFixed(2) }} m/s</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-block">
          <i class="el-icon-upload2 stat-icon" />
          <span class="stat-label">Vel. máxima</span>
          <span class="stat-value">{{ stats.max_speed.toFixed(2) }} m/s</span>
        </div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script>
export default {
  name: 'BolaEstadisticas',
  props: {
    stats: {
      type: Object,
      required: true
    }
  }
}
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
