import { useQuery } from '@tanstack/react-query';
import { marketsAPI } from '@/api/markets';

interface UseMarketsParams {
  category_id?: string;
  community_id?: string;
  status?: 'open' | 'closed' | 'resolved';
  search?: string;
  sort?: 'volume' | 'newest' | 'closing_soon';
  limit?: number;
  offset?: number;
}

export const useMarkets = (params: UseMarketsParams) => {
  return useQuery({
    queryKey: ['markets', params],
    queryFn: () => marketsAPI.fetchMarkets(params),
  });
};

export const useMarketDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['markets', id],
    queryFn: () => marketsAPI.fetchMarket(id!),
    enabled: !!id,
  });
};

export const useMarketHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: ['markets', id, 'history'],
    queryFn: () => marketsAPI.fetchMarketHistory(id!),
    enabled: !!id,
  });
};
