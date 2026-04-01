import { useMarkets } from '@/hooks/useMarkets';
import { MarketList } from '@/components/markets/MarketList';
import { DailyClaimBanner } from '@/components/shared/DailyClaimBanner';
import { Link } from 'react-router-dom';

export const HomePage = () => {
  const { data, isLoading } = useMarkets({
    limit: 12,
    sort: 'volume',
    status: 'open',
  });

  return (
    <div className="space-y-8">
      <DailyClaimBanner />

      <div className="app-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Bienvenue à PolyOdds</h1>
            <p className="text-muted-foreground">C'est quoi les odds</p>
          </div>
          <Link to="/bets" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 shadow-[0_10px_20px_rgba(87,104,175,0.25)]">
            Voir tous les marchés
          </Link>
        </div>
        <MarketList markets={data?.markets || []} isLoading={isLoading} />
      </div>
    </div>
  );
};
