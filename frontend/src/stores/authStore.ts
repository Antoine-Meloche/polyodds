import { create } from 'zustand';
import type { User } from '@/types';

interface AuthStore {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setIsLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  // Hydrate from localStorage
  const savedToken = localStorage.getItem('auth_token');
  const savedUser = localStorage.getItem('auth_user');

  return {
    token: savedToken,
    user: savedUser ? JSON.parse(savedUser) : null,
    isLoading: false,

    setAuth: (token: string, user: User) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      set({ token, user });
    },

    logout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      set({ token: null, user: null });
    },

    setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  };
});
