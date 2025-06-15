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
    const api = getApi();
    const formData = new FormData();
    formData.append('file', file, file.name);
    //const response = await api.post('/api/video/upload_video_temp', formData);
    //return response.data;
    const { data } = await api.post('/upload_video_temp', formData);
    return data;
  },

  async loadFrame(fileName) {
    const api = getApi();
    const { data } = await api.post('/load_frame', { fileName });
    return data;  
  },

  // Envía el video para que se realice el análisis.
  async uploadVideo(fileName, payload) {

    //const { corners, display_width, display_height, players_positions  } = payload;
    //console.log('[videoService] Payload recibido:', payload);
    const body = {fileName, ...payload};

    //console.log('[videoService] Cuerpo a enviar al endpoint:', body);
    const api = getApi();
    const response = await api.post('/upload_video', body);
    return response.data;
  }
};