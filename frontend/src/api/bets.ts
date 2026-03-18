import client from './client';
import type { BetResponse, PlaceBetRequest } from '@/types';

export const betsAPI = {
  placeBet: async (market_id: string, outcome_index: number, amount: number): Promise<BetResponse> => {
    const payload: PlaceBetRequest = {
      outcome_index,
      amount,
    };
    const res = await client.post(`/markets/${market_id}/bet`, payload);
    return res.data;
  },
};
