import client from './client';
import type { BetsResponse, LeaderboardResponse, UserWithStats } from '@/types';

interface FetchUserBetsParams {
  status?: 'open' | 'resolved';
  limit?: number;
  offset?: number;
}

interface FetchLeaderboardParams {
  limit?: number;
  offset?: number;
}

export const usersAPI = {
  fetchUser: async (id: string): Promise<UserWithStats> => {
    const res = await client.get(`/users/${id}`);
    return res.data;
  },

  fetchUserBets: async (id: string, params: FetchUserBetsParams): Promise<BetsResponse> => {
    const res = await client.get(`/users/${id}/bets`, { params });
    return res.data;
  },

  fetchLeaderboard: async (params: FetchLeaderboardParams): Promise<LeaderboardResponse> => {
    const res = await client.get('/leaderboard', { params });
    return res.data;
  },

  deleteMe: async (): Promise<void> => {
    await client.delete('/users/me');
  },
};
