import client from './client';
import type { User, Bet, LeaderboardEntry } from '@/types';

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
  fetchUser: async (id: string): Promise<User> => {
    const res = await client.get(`/users/${id}`);
    return res.data;
  },

  fetchUserBets: async (id: string, params: FetchUserBetsParams): Promise<{ bets: Bet[]; total: number }> => {
    const res = await client.get(`/users/${id}/bets`, { params });
    return res.data;
  },

  fetchLeaderboard: async (params: FetchLeaderboardParams): Promise<{ users: LeaderboardEntry[]; total: number }> => {
    const res = await client.get('/leaderboard', { params });
    return res.data;
  },
};
