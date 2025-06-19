<template>
  <el-card shadow="hover" class="players-overview-card" >
    <el-row :gutter="20" class="players-overview-row" justify="center">
      <el-col v-for="player in playersList" :key="player.id"
        :xs="12" :sm="8" :md="6" :lg="4" class="players-overview-col">
        <div class="players-overview-block">
          <el-avatar :src="getAvatarUrl(player.avatarPath)" :size="avatarSize" shape="square"/>
          <div class="players-overview-name">{{ player.name }}</div>
        </div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { defineProps, computed } from 'vue'
import axios from 'axios'

const props = defineProps({
  players: {
    type: Array,
    required: true
  }
})

const positionLabels = {
  top_left:     'Arriba izquierda',
  top_right:    'Arriba derecha',
  bottom_left:  'Abajo izquierda',
  bottom_right: 'Abajo derecha'
}

// Creamos un array [{ id, name, avatarPath }, …]
const playersList = computed(() =>
  Object.entries(props.players).map(([id, p]) => ({
    id,
    name: p.name && p.name !== id ? p.name : (positionLabels[id] || id),
    avatarPath: p.avatarPath
  })),
)

function getAvatarUrl(path) {
    console.log('getAvatarUrl', path)
  if (!path) return ''
  return path.startsWith('http')
    ? path
    : axios.defaults.baseURL + path
}

</script>

<style scoped>
.players-overview-card {
  margin-bottom: 20px;
}
.players-overview-row {
  margin: 0 -10px;
}
.players-overview-col {
  display: flex;
  justify-content: center;
}
.players-overview-block {
  text-align: center;
}
.players-overview-name {
  margin-top: 6px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.players-overview-block ::v-deep .el-avatar {
  /* mínimo 40px, ideal 10% del ancho del viewport, máximo 64px */
  width:  clamp(40px, 10vw, 64px) !important;
  height: clamp(40px, 10vw, 64px) !important;
}
</style>