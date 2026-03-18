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

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome to PolyOdds</h1>
            <p className="text-muted-foreground">Predict outcomes, earn points, climb the leaderboard</p>
          </div>
          <Link to="/markets" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
            View All Markets
          </Link>
        </div>
        <MarketList markets={data?.markets || []} isLoading={isLoading} />
      </div>
    </div>
  );
};
