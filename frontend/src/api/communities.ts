import client from './client';
import type {
  Community,
  CommunityDetailResponse,
  CommunityListResponse,
  CommunityMembersResponse,
  CreateCommunityRequest,
  MarketsResponse,
  RoleResponse,
  UpdateCommunityRequest,
} from '@/types';

interface FetchCommunitiesParams {
  search?: string;
  limit?: number;
  offset?: number;
}

interface FetchCommunityMembersParams {
  limit?: number;
  offset?: number;
}

interface FetchCommunityMarketsParams {
  status?: 'open' | 'resolved';
  limit?: number;
  offset?: number;
}

export const communitiesAPI = {
  fetchCommunities: async (params: FetchCommunitiesParams): Promise<CommunityListResponse> => {
    const res = await client.get('/communities', { params });
    return res.data;
  },

  fetchCommunity: async (id: string): Promise<CommunityDetailResponse> => {
    const res = await client.get(`/communities/${id}`);
    return res.data;
  },

  createCommunity: async (data: CreateCommunityRequest): Promise<Community> => {
    const res = await client.post('/communities', data);
    return res.data;
  },

  updateCommunity: async (id: string, data: UpdateCommunityRequest): Promise<Community> => {
    const res = await client.patch(`/communities/${id}`, data);
    return res.data;
  },

  deleteCommunity: async (id: string): Promise<void> => {
    await client.delete(`/communities/${id}`);
  },

  joinCommunity: async (id: string): Promise<RoleResponse> => {
    const res = await client.post(`/communities/${id}/join`);
    return res.data;
  },

  leaveCommunity: async (id: string): Promise<void> => {
    await client.delete(`/communities/${id}/leave`);
  },

  fetchMembers: async (id: string, params: FetchCommunityMembersParams): Promise<CommunityMembersResponse> => {
    const res = await client.get(`/communities/${id}/members`, { params });
    return res.data;
  },

  inviteUser: async (id: string, user_id: string): Promise<void> => {
    await client.post(`/communities/${id}/invite`, { user_id });
  },

  fetchCommunityMarkets: async (
    id: string,
    params: FetchCommunityMarketsParams
  ): Promise<MarketsResponse> => {
    const res = await client.get(`/communities/${id}/markets`, { params });
    return res.data;
  },
};
