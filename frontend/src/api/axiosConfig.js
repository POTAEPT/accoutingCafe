import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // URL ของ Backend ที่เต้ทำไว้
});

// ดึง Token มาแนบไปกับทุก Request อัตโนมัติ (Interceptors)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;