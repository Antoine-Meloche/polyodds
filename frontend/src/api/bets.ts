import client from './client';
import type { BetResponse } from '@/types';

export const betsAPI = {
  placeBet: async (market_id: string, outcome_index: number, amount: number): Promise<BetResponse> => {
    const res = await client.post(`/markets/${market_id}/bet`, {
      outcome_index,
      amount,
    });
    return res.data;
  },
};
