export type { AuthResponse } from './generated/auth/AuthResponse';
export type { DailyClaimResponse } from './generated/auth/DailyClaimResponse';
export type { LoginRequest } from './generated/auth/LoginRequest';
export type { RegisterRequest } from './generated/auth/RegisterRequest';

export type { CategoriesResponse } from './generated/categories/CategoriesResponse';
export type { Category } from './generated/categories/Category';
export type { CategoryCreateRequest } from './generated/categories/CategoryCreateRequest';

export type { Community } from './generated/communities/Community';
export type { CommunityDetailResponse } from './generated/communities/CommunityDetailResponse';
export type { CommunityListResponse } from './generated/communities/CommunityListResponse';
export type { CommunityMember } from './generated/communities/CommunityMember';
export type { CommunityMembersResponse } from './generated/communities/CommunityMembersResponse';
export type { CreateCommunityRequest } from './generated/communities/CreateCommunityRequest';
export type { InviteMemberRequest } from './generated/communities/InviteMemberRequest';
export type { RoleResponse } from './generated/communities/RoleResponse';
export type { UpdateCommunityRequest } from './generated/communities/UpdateCommunityRequest';

export type { Bet } from './generated/markets/Bet';
export type { BetResponse } from './generated/markets/BetResponse';
export type { CreateMarketRequest } from './generated/markets/CreateMarketRequest';
export type { Market } from './generated/markets/Market';
export type { MarketHistoryResponse } from './generated/markets/MarketHistoryResponse';
export type { MarketPool } from './generated/markets/MarketPool';
export type { MarketsResponse } from './generated/markets/MarketsResponse';
export type { MarketWithPools } from './generated/markets/MarketWithPools';
export type { PlaceBetRequest } from './generated/markets/PlaceBetRequest';
export type { ProbabilitySnapshot } from './generated/markets/ProbabilitySnapshot';
export type { ResolveMarketRequest } from './generated/markets/ResolveMarketRequest';
export type { UpdateMarketRequest } from './generated/markets/UpdateMarketRequest';
export type { UserPosition } from './generated/markets/UserPosition';

export type { BetsResponse } from './generated/users/BetsResponse';
export type { LeaderboardEntry } from './generated/users/LeaderboardEntry';
export type { LeaderboardResponse } from './generated/users/LeaderboardResponse';
export type { User } from './generated/users/User';
export type { UserStats } from './generated/users/UserStats';
export type { UserWithStats } from './generated/users/UserWithStats';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
}
