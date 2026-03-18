import client from './client';
import type { User, AuthResponse, DailyClaimResponse } from '@/types';

export const authAPI = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await client.post('/auth/register', { username, email, password });
    return res.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await client.post('/auth/login', { email, password });
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
