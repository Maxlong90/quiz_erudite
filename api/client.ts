import axios from 'axios';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://quiz-erudit-backend.turbosuslik.online/api/v1';
export const APP_SLUG = process.env.EXPO_PUBLIC_APP_SLUG ?? 'erudite-quiz';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
