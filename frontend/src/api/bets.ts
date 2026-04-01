import client from './client';
import type { BetResponse, PlaceBetRequest } from '@/types';

export const betsAPI = {
  placeBet: async (
    market_id: string,
    outcome_index: number,
    amount: number,
    side: 'buy' | 'sell'
  ): Promise<BetResponse> => {
    const payload: PlaceBetRequest = {
      outcome_index,
      amount,
      side,
    };
    const res = await client.post(`/markets/${market_id}/bet`, payload);
    return res.data;
  },
};
