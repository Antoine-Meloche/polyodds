import { useQuery } from '@tanstack/react-query';
import { communitiesAPI } from '@/api/communities';

interface UseCommunitiesParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export const useCommunities = (params: UseCommunitiesParams = {}) => {
  return useQuery({
    queryKey: ['communities', params],
    queryFn: () => communitiesAPI.fetchCommunities(params),
  });
};

export const useCommunityDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['communities', id],
    queryFn: () => communitiesAPI.fetchCommunity(id!),
    enabled: !!id,
  });
};
