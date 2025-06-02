<!-- src/components/AppFooter.vue -->
<template>
  <el-footer class="footer">
    <p>© StatPadel {{ currentYear }}</p>
  </el-footer>
</template>

<script setup>
import { ref } from 'vue'

// Año actual para el footer
const currentYear = ref(new Date().getFullYear())
</script>

<style scoped>
/* ========================================= */
/* ================= FOOTER ================ */
/* ========================================= */
.footer {
  text-align: center;
  padding: 20px;
  position: relative;
  background-color: var(--el-bg-color);
  font-size: 0.9rem;
}

.footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--el-border-color);
  opacity: 0.4;
}
</style>