import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueries, useMutation } from '@tanstack/react-query';
import { usersAPI } from '@/api/users';
import { marketsAPI } from '@/api/markets';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PointsBadge } from '@/components/shared/PointsBadge';

export const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
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

  const uniqueMarketIds = Array.from(new Set((betsData?.bets || []).map((bet) => bet.market_id)));
  const marketQueries = useQueries({
    queries: uniqueMarketIds.map((marketId) => ({
      queryKey: ['markets', marketId],
      queryFn: () => marketsAPI.fetchMarket(marketId),
      staleTime: 60_000,
    })),
  });

  const marketTitleById = new Map<string, string>();
  uniqueMarketIds.forEach((marketId, index) => {
    const title = marketQueries[index]?.data?.title;
    if (title) {
      marketTitleById.set(marketId, title);
    }
  });

  const isOwnProfile = !!authUser && !!id && authUser.id === id;

  const deleteAccountMutation = useMutation({
    mutationFn: () => usersAPI.deleteMe(),
    onSuccess: () => {
      logout();
      navigate('/register');
    },
  });

  const handleDeleteAccount = () => {
    if (!isOwnProfile || deleteAccountMutation.isPending) return;

    const confirmed = window.confirm('Voulez-vous vraiment supprimer votre compte ? Cette action est irreversible.');
    if (!confirmed) return;

    deleteAccountMutation.mutate();
  };

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
          <div className="flex items-start gap-3">
            <PointsBadge points={user.points} />
            {isOwnProfile && (
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
                className="px-3 py-1.5 text-sm rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? 'Suppression...' : 'Supprimer mon compte'}
              </button>
            )}
          </div>
        </div>

        {deleteAccountMutation.error && (
          <p className="text-sm text-destructive mb-2">Impossible de supprimer le compte. Veuillez reessayer.</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-secondary rounded-lg border border-primary/20">
            <p className="text-2xl font-bold">{user.stats?.markets_created || 0}</p>
            <p className="text-xs text-muted-foreground">Marchés créés</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg border border-primary/20">
            <p className="text-2xl font-bold">{user.stats?.bets_placed || 0}</p>
            <p className="text-xs text-muted-foreground">Mises placées</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg border border-primary/20">
            <p className="text-2xl font-bold">{user.stats?.bets_won || 0}</p>
            <p className="text-xs text-muted-foreground">Mises gagnées</p>
          </div>
        </div>
      </div>

      {/* Mises Tabs */}
      <div>
        <div className="flex gap-4 border-b border-primary/20 mb-4">
          <button
            onClick={() => setTab('open')}
            className={`px-4 py-2 font-medium border-b-2 ${
              tab === 'open' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Mises ouvertes
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-4 py-2 font-medium border-b-2 ${
              tab === 'resolved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Mises résolues
          </button>
        </div>

        {/* Mises List */}
        <div className="space-y-3">
          {betsData && betsData.bets.length > 0 ? (
            betsData.bets.map((bet) => (
              <div key={bet.id} className="app-panel p-4">
                <p className="font-medium">Marché: {marketTitleById.get(bet.market_id) || 'Marché'}</p>
                <p className="text-sm text-muted-foreground">Montant: {bet.amount} points</p>
                <p className="text-xs text-muted-foreground">Placé le {new Date(bet.created_at).toLocaleDateString('fr-CA')}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-6">Aucune mise {tab === 'open' ? 'ouverte' : 'résolue'}</p>
          )}
        </div>
      </div>
    </div>
  );
};
