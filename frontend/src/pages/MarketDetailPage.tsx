import { useParams } from 'react-router-dom';
import { useMarketDetail, useMarketHistory } from '@/hooks/useMarkets';
import { BetPanel } from '@/components/markets/BetPanel';
import { OddsChart } from '@/components/markets/OddsChart';
import { OutcomeBadge } from '@/components/markets/OutcomeBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatRelative } from '@/utils/dates';

export const MarketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: market, isLoading } = useMarketDetail(id);
  const { data: history } = useMarketHistory(id);

  if (isLoading || !market) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{market.title}</h1>
        <p className="text-muted-foreground">{market.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Market Info */}
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="font-semibold mb-3">Market Info</h2>
            <div className="space-y-2 text-sm">
              <p>Status: <span className="font-medium">{market.status}</span></p>
              <p>Closes: <span className="font-medium">{formatRelative(market.close_at)}</span></p>
              <p>Total Volume: <span className="font-medium">{market.total_volume}</span></p>
            </div>
          </div>

          {/* Outcomes & Pools */}
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="font-semibold mb-3">Outcomes</h2>
            <div className="space-y-3">
              {market.pools.map((pool, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-secondary">
                  <OutcomeBadge outcome={pool.outcome} index={index} />
                  <div className="text-sm space-y-1 text-right">
                    <p className="text-muted-foreground">Pool: {pool.total_points}</p>
                    <p className="font-semibold">{(pool.probability * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Probability Chart */}
          {history && history.length > 0 && (
            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-semibold mb-3">Probability History</h2>
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
