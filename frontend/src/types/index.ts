/* Auth */
export interface User {
  id: string;
  username: string;
  points: number;
  created_at: string;
  last_claim_at: string;
  stats?: {
    markets_created: number;
    bets_placed: number;
    bets_won: number;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DailyClaimResponse {
  points_earned: number;
  new_balance: number;
  next_claim_at: string;
}

/* Categories */
export interface Category {
  id: string;
  name: string;
  slug: string;
}

/* Communities */
export interface Community {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  creator_id: string;
  created_at: string;
  member_count?: number;
  market_count?: number;
  is_member?: boolean;
  role?: 'admin' | 'member';
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

/* Markets */
export interface Market {
  id: string;
  title: string;
  description: string;
  category_id: string;
  community_id?: string;
  creator_id: string;
  outcomes: string[];
  status: 'open' | 'closed' | 'resolved';
  winning_outcome_index?: number;
  close_at: string;
  created_at: string;
}

export interface MarketWithPools extends Market {
  outcomes: string[];
  pools: {
    outcome: string;
    total_points: number;
    probability: number;
  }[];
  total_volume: number;
  user_position?: {
    outcome_index: number;
    amount: number;
  } | null;
}

export interface ProbabilitySnapshot {
  recorded_at: string;
  probabilities: number[];
}

export interface MarketHistory {
  history: ProbabilitySnapshot[];
}

/* Bets */
export interface Bet {
  id: string;
  market_id: string;
  user_id: string;
  outcome_index: number;
  amount: number;
  created_at: string;
}

export interface BetResponse {
  bet: Bet;
  new_balance: number;
  probabilities_after: number[];
}

/* Leaderboard */
export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  points: number;
}

export interface LeaderboardResponse {
  users: LeaderboardEntry[];
  total: number;
}

/* Pagination */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

/* Error */
export interface ErrorResponse {
  error: string;
  code: string;
}
