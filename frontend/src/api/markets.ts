import client from './client';
import type {
  CreateMarketRequest,
  Market,
  MarketHistoryResponse,
  MarketsResponse,
  MarketWithPools,
  ProbabilitySnapshot,
  ResolveMarketRequest,
  UpdateMarketRequest,
} from '@/types';

interface FetchMarketsParams {
  category_id?: string;
  community_id?: string;
  status?: 'ouvert' | 'fermé';
  search?: string;
  sort?: 'volume' | 'newest';
  limit?: number;
  offset?: number;
}

export const marketsAPI = {
  fetchMarkets: async (params: FetchMarketsParams): Promise<MarketsResponse> => {
    const res = await client.get('/markets', { params });
    return res.data;
  },

  fetchMarket: async (id: string): Promise<MarketWithPools> => {
    const res = await client.get(`/markets/${id}`);
    return res.data;
  },

  createMarket: async (data: CreateMarketRequest): Promise<Market> => {
    const res = await client.post('/markets', data);
    return res.data;
  },

  updateMarket: async (id: string, data: UpdateMarketRequest): Promise<Market> => {
    const res = await client.patch(`/markets/${id}`, data);
    return res.data;
  },

  resolveMarket: async (id: string, winning_outcome_index: number): Promise<Market> => {
    const payload: ResolveMarketRequest = { winning_outcome_index };
    const res = await client.post(`/markets/${id}/resolve`, payload);
    return res.data;
  },

  fetchMarketHistory: async (id: string): Promise<ProbabilitySnapshot[]> => {
    const res = await client.get<MarketHistoryResponse>(`/markets/${id}/history`);
    return res.data.history;
  },

  fetchMarketBets: async (id: string): Promise<any[]> => {
    const res = await client.get(`/markets/${id}/bets`);
    return res.data.bets;
  },
};
