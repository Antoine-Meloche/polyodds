import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCommunityDetail } from '@/hooks/useCommunities';
import { useAuth } from '@/hooks/useAuth';
import { communitiesAPI } from '@/api/communities';
import { marketsAPI } from '@/api/markets';
import { MarketList } from '@/components/markets/MarketList';
import { MemberList } from '@/components/communities/MemberList';
import { MarketsIcon, MembersIcon, PrivateIcon } from '@/components/shared/icons';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const CommunityDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { data: community, isLoading } = useCommunityDetail(id);

  const { data: membersData } = useQuery({
    queryKey: ['communities', id, 'members'],
    queryFn: () => (id ? communitiesAPI.fetchMembers(id, { limit: 100 }) : null),
    enabled: !!id,
  });

  const { data: marketsData } = useQuery({
    queryKey: ['communities', id, 'markets'],
    queryFn: () => (id ? marketsAPI.fetchMarkets({ community_id: id, limit: 12 }) : null),
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: () => (id ? communitiesAPI.joinCommunity(id) : Promise.reject('No ID')),
  });

  const leaveMutation = useMutation({
    mutationFn: () => (id ? communitiesAPI.leaveCommunity(id) : Promise.reject('No ID')),
  });

  if (isLoading || !community) return <LoadingSpinner />;

  const isMember = community.is_member;
  const canJoin = isAuthenticated && !isMember && !community.is_private;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="app-panel p-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
          <p className="text-muted-foreground">{community.description}</p>
          <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MembersIcon className="size-4" />
              <span>{community.member_count} membres</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MarketsIcon className="size-4" />
              <span>{community.market_count} bets</span>
            </span>
            {community.is_private && (
              <span className="inline-flex items-center gap-1.5">
                <PrivateIcon className="size-4" />
                <span>Privé</span>
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {canJoin && (
            <button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {joinMutation.isPending ? 'Adhésion en cours...' : 'Rejoindre'}
            </button>
          )}
          {isMember && (
            <button
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
              className="px-4 py-2 border border-primary/25 rounded-lg hover:bg-secondary disabled:opacity-50"
            >
              {leaveMutation.isPending ? 'Départ en cours...' : 'Quitter'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bets */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Bets</h2>
          <MarketList markets={marketsData?.markets || []} isLoading={false} />
        </div>

        {/* Members */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Membres</h2>
          {membersData && <MemberList members={membersData.members} />}
        </div>
      </div>
    </div>
  );
};
