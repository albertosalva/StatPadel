<template>
  <div class="jugadores-stats">
    <el-card class="chart-card" shadow="hover">
      <h3>Distancia total recorrida (m)</h3>
      <Bar :data="distanciaData" :options="chartOptions" />
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <h3>Velocidad media (m/s)</h3>
      <Bar :data="velMediaData" :options="chartOptions" />
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <h3>Velocidad máxima (m/s)</h3>
      <Bar :data="velMaximaData" :options="chartOptions" />
    </el-card>
  </div>
</template>

<script>
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

export default {
  name: 'JugadoresEstadisticas',
  components: {
    Bar
  },
  props: {
    players: {
      type: Object,
      required: true
    }
  },
  computed: {
    labels() {
      return Object.keys(this.players)
    },
    distanciaData() {
      return {
        labels: this.labels,
        datasets: [
          {
            label: 'Distancia (m)',
            backgroundColor: '#67C23A',
            data: this.labels.map(id => this.players[id].total_distance.toFixed(2))
          }
        ]
      }
    },
    velMediaData() {
      return {
        labels: this.labels,
        datasets: [
          {
            label: 'Velocidad media (m/s)',
            backgroundColor: '#E6A23C',
            data: this.labels.map(id => this.players[id].average_speed.toFixed(2))
          }
        ]
      }
    },
    velMaximaData() {
      return {
        labels: this.labels,
        datasets: [
          {
            label: 'Velocidad máxima (m/s)',
            backgroundColor: '#F56C6C',
            data: this.labels.map(id => this.players[id].max_speed.toFixed(2))
          }
        ]
      }
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    }

  }
}
</script>

<style scoped>
.jugadores-stats {
  display: flex;
  flex-direction: row;
  gap: 20px;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 20px;
}

.chart-card {
  flex: 1 1 30%;
  min-width: 300px;
  max-width: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: auto;
}

.chart-card canvas {
  height: 250px !important;
  max-height: 250px !important;
}

</style>
