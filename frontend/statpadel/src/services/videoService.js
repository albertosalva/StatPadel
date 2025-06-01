// src/services/videoService.js
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

function getApi() {
  const auth = useAuthStore()
  const base = axios.defaults.baseURL
  return axios.create({
    baseURL: `${base}/api/video`,
    headers: {
      Authorization: `Bearer ${auth.token}`
    }
  })
}

export default {
  // Sube el archivo de video a una carpeta temporal.
  async uploadVideoTemp(file) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const response = await axios.post('/api/video/upload_video_temp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Llama a la API para cargar el video en el backend (por ejemplo, para extraer el primer frame).
  async loadVideo(videoPath) {
    const response = await axios.post('/api/corners/load_video', { video_path: videoPath });
    return response.data;
  },

  // Obtiene el primer frame del video.
  async getFrame() {
    const response = await axios.get('/api/corners/get_frame');
    return response.data;
  },

  // Envía los datos de las esquinas seleccionadas.
  async sendCorners(payload) {
    const response = await axios.post('/api/corners/set_corners', payload);
    return response.data;
  },

  // Envía el video para que se realice el análisis.
  async uploadVideo(file) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const api = getApi();
    const response = await api.post('/upload_video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};