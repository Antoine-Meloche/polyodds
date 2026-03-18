import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { betsAPI } from '@/api/bets';

export const useBet = () => {
  const queryClient = useQueryClient();

  const placeBetMutation = useMutation({
    mutationFn: ({
      market_id,
      outcome_index,
      amount,
    }: {
      market_id: string;
      outcome_index: number;
      amount: number;
    }) => betsAPI.placeBet(market_id, outcome_index, amount),
    onSuccess: (_data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['markets', variables.market_id] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return {
    placeBet: placeBetMutation.mutate,
    isPending: placeBetMutation.isPending,
    error: placeBetMutation.error,
    errorMessage:
      placeBetMutation.error instanceof AxiosError
        ? placeBetMutation.error.response?.data?.error ?? placeBetMutation.error.message
        : placeBetMutation.error instanceof Error
          ? placeBetMutation.error.message
          : null,
    data: placeBetMutation.data,
  };
};
