import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '@/api/users';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PointsBadge } from '@/components/shared/PointsBadge';

export const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersAPI.fetchUser(id || ''),
    enabled: !!id,
  });

  const { data: betsData } = useQuery({
    queryKey: ['users', id, 'bets', tab],
    queryFn: () =>
      usersAPI.fetchUserBets(id || '', {
        status: tab,
        limit: 50,
      }),
    enabled: !!id,
  });

  if (userLoading || !user) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="app-panel p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="text-sm text-muted-foreground">Rejoint le {new Date(user.created_at).toLocaleDateString('fr-CA')}</p>
          </div>
          <PointsBadge points={user.points} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-secondary rounded-lg border border-primary/20">
            <p className="text-2xl font-bold">{user.stats?.markets_created || 0}</p>
            <p className="text-xs text-muted-foreground">Bets créés</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg border border-primary/20">
            <p className="text-2xl font-bold">{user.stats?.bets_placed || 0}</p>
            <p className="text-xs text-muted-foreground">Bets placés</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg border border-primary/20">
            <p className="text-2xl font-bold">{user.stats?.bets_won || 0}</p>
            <p className="text-xs text-muted-foreground">Bets gagnés</p>
          </div>
        </div>
      </div>

      {/* Bets Tabs */}
      <div>
        <div className="flex gap-4 border-b border-primary/20 mb-4">
          <button
            onClick={() => setTab('open')}
            className={`px-4 py-2 font-medium border-b-2 ${
              tab === 'open' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Bets ouverts
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-4 py-2 font-medium border-b-2 ${
              tab === 'resolved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Bets résolus
          </button>
        </div>

        {/* Bets List */}
        <div className="space-y-3">
          {betsData && betsData.bets.length > 0 ? (
            betsData.bets.map((bet) => (
              <div key={bet.id} className="app-panel p-4">
                <p className="font-medium">Bet: {bet.market_id}</p>
                <p className="text-sm text-muted-foreground">Montant: {bet.amount} points</p>
                <p className="text-xs text-muted-foreground">Placé le {new Date(bet.created_at).toLocaleDateString('fr-CA')}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-6">Aucun bet {tab === 'open' ? 'ouvert' : 'résolu'}</p>
          )}
        </div>
      </div>
    </div>
  );
};
