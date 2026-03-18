import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '@/api/auth';

export const useDailyClaim = () => {
  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: () => authAPI.dailyClaim(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return {
    claim: claimMutation.mutate,
    isPending: claimMutation.isPending,
    error: claimMutation.error,
  };
};
