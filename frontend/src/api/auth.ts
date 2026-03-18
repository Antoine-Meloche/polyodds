import client from './client';
import type { User, AuthResponse, DailyClaimResponse } from '@/types';

export const authAPI = {
  register: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await client.post('/auth/register', { username, password });
    return res.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await client.post('/auth/login', { username, password });
    return res.data;
  },

  fetchMe: async (): Promise<User> => {
    const res = await client.get('/auth/me');
    return res.data;
  },

  dailyClaim: async (): Promise<DailyClaimResponse> => {
    const res = await client.post('/auth/daily-claim');
    return res.data;
  },
};
