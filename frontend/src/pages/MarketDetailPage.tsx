import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { marketsAPI } from '@/api/markets';
import { useMarketDetail, useMarketHistory } from '@/hooks/useMarkets';
import { useAuth } from '@/hooks/useAuth';
import { BetPanel } from '@/components/markets/BetPanel';
import { OddsChart } from '@/components/markets/OddsChart';
import { OutcomeBadge } from '@/components/markets/OutcomeBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const MarketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: market, isLoading } = useMarketDetail(id);
  const { data: history } = useMarketHistory(id);
  const [winningOutcomeIndex, setWinningOutcomeIndex] = useState<number>(0);

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

  const resolveErrorMessage =
    resolveMarketMutation.error instanceof AxiosError
      ? resolveMarketMutation.error.response?.data?.error ?? resolveMarketMutation.error.message
      : resolveMarketMutation.error instanceof Error
        ? resolveMarketMutation.error.message
        : null;

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
          {/* Bet Info */}
          <div className="app-panel p-4">
            <h2 className="font-semibold mb-3">Informations du Bet</h2>
            <div className="space-y-2 text-sm">
              <p>Statut: <span className="font-medium">{market.status}</span></p>
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
                En tant que créateur, vous pouvez terminer ce bet et sélectionner l'option gagnante.
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
                {resolveMarketMutation.isPending ? 'Fin du bet en cours...' : 'Finir le bet'}
              </button>
            </div>
          )}

          {/* Probability Chart */}
          {history && history.length > 0 && (
            <div className="app-panel p-4">
              <h2 className="font-semibold mb-3">Historique des probabilités</h2>
              <OddsChart history={history} outcomes={market.outcomes} />
            </div>
          )}
        </div>

        {/* Bet Panel */}
        <div>
          <BetPanel market={market} />
        </div>
      </div>
    </div>
  );
};
