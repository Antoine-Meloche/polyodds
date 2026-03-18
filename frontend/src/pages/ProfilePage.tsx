import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '@/api/users';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PointsBadge } from '@/components/shared/PointsBadge';

export const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['users', username],
    queryFn: async () => {
      // In a real app, we'd fetch by username and get the id
      // For now, we'll just fetch a placeholder
      return usersAPI.fetchUser(username || '');
    },
    enabled: !!username,
  });

  const { data: betsData } = useQuery({
    queryKey: ['users', username, 'bets', tab],
    queryFn: () =>
      usersAPI.fetchUserBets(username || '', {
        status: tab,
        limit: 50,
      }),
    enabled: !!username,
  });

  if (userLoading || !user) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="text-sm text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <PointsBadge points={user.points} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{user.stats?.markets_created || 0}</p>
            <p className="text-xs text-muted-foreground">Markets Created</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{user.stats?.bets_placed || 0}</p>
            <p className="text-xs text-muted-foreground">Bets Placed</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{user.stats?.bets_won || 0}</p>
            <p className="text-xs text-muted-foreground">Bets Won</p>
          </div>
        </div>
      </div>

      {/* Bets Tabs */}
      <div>
        <div className="flex gap-4 border-b mb-4">
          <button
            onClick={() => setTab('open')}
            className={`px-4 py-2 font-medium border-b-2 ${
              tab === 'open' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Open Bets
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-4 py-2 font-medium border-b-2 ${
              tab === 'resolved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Resolved Bets
          </button>
        </div>

        {/* Bets List */}
        <div className="space-y-3">
          {betsData && betsData.bets.length > 0 ? (
            betsData.bets.map((bet) => (
              <div key={bet.id} className="border rounded-lg p-4 bg-card">
                <p className="font-medium">Market: {bet.market_id}</p>
                <p className="text-sm text-muted-foreground">Amount: {bet.amount} points</p>
                <p className="text-xs text-muted-foreground">Placed on {new Date(bet.created_at).toLocaleDateString()}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-6">No {tab} bets</p>
          )}
        </div>
      </div>
    </div>
  );
};
