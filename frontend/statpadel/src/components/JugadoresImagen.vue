<script>
/**
 * @module    components/JugadoresImagen
 * @component JugadoresImagen
 * @description
 * Componente que muestra una cuadrícula con la vista general de los jugadores,
 * renderizando para cada uno su avatar, nombre y nivel.
 *
 * @prop {Array<Object>}   players            - Array con la información de los jugadores.
 * @prop {string}          players[].id      - Identificador único o posición (e.g. "top_left").
 * @prop {string}          players[].name    - Nombre del jugador o etiqueta de posición.
 * @prop {string}          players[].avatarPath - Ruta relativa o URL del avatar del jugador.
 * @prop {string}          players[].level   - Nivel de habilidad del jugador.
 */
</script>

<template>
  <el-card v-if="playersList.length > 0" shadow="hover" class="players-overview-card" >
    <el-row :gutter="20" class="players-overview-row" justify="center">
      <el-col v-for="player in playersList" :key="player.id"
        :xs="12" :sm="8" :md="6" :lg="4" class="players-overview-col">
        <div class="players-overview-block">
          <el-avatar :src="player.avatarURL" shape="square"/>
          <div class="players-overview-name">{{ player.name }}</div>
          <div class="players-overview-level">Nivel: {{ player.level }}</div>
        </div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { defineProps, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
//import axios from 'axios'

const authStore = useAuthStore()

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
    avatarURL: authStore.getUserAvatarURL(p.avatarPath),
    level: p.level
  })),
)


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