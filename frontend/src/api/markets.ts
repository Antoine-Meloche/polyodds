import client from './client';
import type { Market, MarketWithPools,  ProbabilitySnapshot } from '@/types';

interface FetchMarketsParams {
  category_id?: string;
  community_id?: string;
  status?: 'open' | 'closed' | 'resolved';
  search?: string;
  sort?: 'volume' | 'newest';
  limit?: number;
  offset?: number;
}

export const marketsAPI = {
  fetchMarkets: async (params: FetchMarketsParams): Promise<{ markets: Market[]; total: number }> => {
    const res = await client.get('/markets', { params });
    return res.data;
  },

  fetchMarket: async (id: string): Promise<MarketWithPools> => {
    const res = await client.get(`/markets/${id}`);
    return res.data;
  },

  createMarket: async (data: {
    title: string;
    description: string;
    category_id: string;
    community_id?: string;
    outcomes: string[];
  }): Promise<Market> => {
    const res = await client.post('/markets', data);
    return res.data;
  },

  updateMarket: async (
    id: string,
    data: {
      title?: string;
      description?: string;
    }
  ): Promise<Market> => {
    const res = await client.patch(`/markets/${id}`, data);
    return res.data;
  },

  resolveMarket: async (id: string, winning_outcome_index: number): Promise<Market> => {
    const res = await client.post(`/markets/${id}/resolve`, { winning_outcome_index });
    return res.data;
  },

  fetchMarketHistory: async (id: string): Promise<ProbabilitySnapshot[]> => {
    const res = await client.get(`/markets/${id}/history`);
    return res.data.history;
  },

  fetchMarketBets: async (id: string): Promise<any[]> => {
    const res = await client.get(`/markets/${id}/bets`);
    return res.data.bets;
  },
};
