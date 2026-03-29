import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://quiz-erudit-backend.turbosuslik.online/api/v1',
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
