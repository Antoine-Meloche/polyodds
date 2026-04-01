import client from './client';
import type { CategoriesResponse, Category, CategoryCreateRequest } from '@/types';

export const categoriesAPI = {
  fetchCategories: async (): Promise<CategoriesResponse> => {
    const res = await client.get('/categories');
    return res.data;
  },

  createCategory: async (name: string, slug: string): Promise<Category> => {
    const payload: CategoryCreateRequest = { name, slug };
    const res = await client.post('/categories', payload);
    return res.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await client.delete(`/categories/${id}`);
  },
};
