import { useMutation, useQueryClient } from '@tanstack/react-query';
import { betsAPI } from '@/api/bets';
import { getAxiosErrorMessage } from '@/utils/errors';

export const useBet = () => {
  const queryClient = useQueryClient();

  const placeBetMutation = useMutation({
    mutationFn: ({
      market_id,
      outcome_index,
      amount,
      side,
    }: {
      market_id: string;
      outcome_index: number;
      amount: number;
      side: 'buy' | 'sell';
    }) => betsAPI.placeBet(market_id, outcome_index, amount, side),
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
    errorMessage: getAxiosErrorMessage(placeBetMutation.error),
    data: placeBetMutation.data,
  };
};
