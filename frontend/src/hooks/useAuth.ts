import { useQuery } from '@tanstack/react-query';
import { authAPI } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const { user, setAuth, logout } = useAuthStore();

  // Fetch current user
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authAPI.fetchMe(),
    enabled: !!useAuthStore.getState().token,
    retry: false,
  });

  return {
    user: meQuery.data || user,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data || !!user,
    logout,
    setAuth,
  };
};
