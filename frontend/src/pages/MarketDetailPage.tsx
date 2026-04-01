import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { marketsAPI } from '@/api/markets';
import { useMarketDetail, useMarketHistory } from '@/hooks/useMarkets';
import { useAuth } from '@/hooks/useAuth';
import { BetPanel } from '@/components/markets/BetPanel';
import { OddsChart } from '@/components/markets/OddsChart';
import { OutcomeBadge } from '@/components/markets/OutcomeBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { connectWebSocket } from '@/utils/ws';
import { getAxiosErrorMessage } from '@/utils/errors';
import { getMarketStatusLabelFr } from '@/utils/marketStatus';

export const MarketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: market, isLoading } = useMarketDetail(id);
  const { data: history } = useMarketHistory(id);
  const [winningOutcomeIndex, setWinningOutcomeIndex] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    return connectWebSocket(`/api/markets/${id}/ws`, () => {
      queryClient.invalidateQueries({ queryKey: ['markets', id] });
      queryClient.invalidateQueries({ queryKey: ['markets', id, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    });
  }, [id, queryClient]);

  const resolveMarketMutation = useMutation({
    mutationFn: (outcomeIndex: number) => marketsAPI.resolveMarket(id!, outcomeIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets', id] });
      queryClient.invalidateQueries({ queryKey: ['markets', id, 'history'] });
    },
  });

  if (isLoading || !market) return <LoadingSpinner />;

  const isCreator = !!user && user.id === market.creator_id;
  const canResolveNow = market.status !== 'resolved';

  const resolveErrorMessage = getAxiosErrorMessage(resolveMarketMutation.error);

  const handleResolve = () => {
    if (!canResolveNow || resolveMarketMutation.isPending) return;
    resolveMarketMutation.mutate(winningOutcomeIndex);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{market.title}</h1>
        <p className="text-muted-foreground">{market.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Market Info */}
          <div className="app-panel p-4">
            <h2 className="font-semibold mb-3">Informations du marché</h2>
            <div className="space-y-2 text-sm">
              <p>Statut: <span className="font-medium">{getMarketStatusLabelFr(market.status)}</span></p>
              <p>Volume total: <span className="font-medium">{market.total_volume}</span></p>
            </div>
          </div>

          {/* Outcomes & Pools */}
          <div className="app-panel p-4">
            <h2 className="font-semibold mb-3">Résultats</h2>
            <div className="space-y-3">
              {market.pools.map((pool, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-secondary">
                  <OutcomeBadge outcome={pool.outcome} index={index} />
                  <div className="text-sm space-y-1 text-right">
                    <p className="text-muted-foreground">Bassin: {pool.total_points}</p>
                    <p className="font-semibold">{(pool.probability * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isCreator && (
            <div className="app-panel p-4 space-y-3">
              <h2 className="font-semibold">Options d'administration</h2>
              <p className="text-sm text-muted-foreground">
                En tant que créateur, vous pouvez clôturer ce marché et sélectionner l'option gagnante.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium">Option gagnante</label>
                <select
                  value={winningOutcomeIndex}
                  onChange={(e) => setWinningOutcomeIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  disabled={market.status === 'resolved' || resolveMarketMutation.isPending}
                >
                  {market.outcomes.map((outcome, index) => (
                    <option key={outcome + index} value={index}>
                      {outcome}
                    </option>
                  ))}
                </select>
              </div>

              {resolveErrorMessage && (
                <div className="text-destructive text-sm">{resolveErrorMessage}</div>
              )}

              <button
                onClick={handleResolve}
                disabled={!canResolveNow || market.status === 'resolved' || resolveMarketMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
              >
                {resolveMarketMutation.isPending ? 'Clôture du marché en cours...' : 'Clôturer le marché'}
              </button>
            </div>
          )}

          {/* Probability Chart */}
          <div className="app-panel p-4">
            <h2 className="font-semibold mb-3">Historique des probabilités</h2>
            <OddsChart history={history || []} outcomes={market.outcomes} />
          </div>
        </div>

        {/* Mise Panel */}
        <div>
          <BetPanel market={market} />
        </div>
      </div>
    </div>
  );
};
