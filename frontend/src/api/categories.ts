import client from './client';
import type { Category } from '@/types';

export const categoriesAPI = {
  fetchCategories: async (): Promise<{ categories: Category[] }> => {
    const res = await client.get('/categories');
    return res.data;
  },

  createCategory: async (name: string, slug: string): Promise<Category> => {
    const res = await client.post('/categories', { name, slug });
    return res.data;
  },
};
