import axios from 'axios';
import { Channel, ChannelListResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

export const channelsApi = {
  getChannels: (params?: Record<string, unknown>): Promise<ChannelListResponse> =>
    api.get('/api/channels', { params }).then(r => r.data),
  getByCountry: (code: string, params?: Record<string, unknown>): Promise<ChannelListResponse> =>
    api.get(`/api/channels/countries/${code}`, { params }).then(r => r.data),
  getCategories: (): Promise<string[]> =>
    api.get('/api/channels/categories').then(r => r.data),
  getFeatured: (): Promise<{ channels: Channel[] }> =>
    api.get('/api/channels/featured').then(r => r.data),
};

export default api;
