import type { Market } from '@/types';
import { MarketCard } from './MarketCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

interface MarketListProps {
  markets: Market[];
  isLoading: boolean;
}

export const MarketList = ({
  markets,
  isLoading,
}: MarketListProps) => {
  if (isLoading) return <LoadingSpinner />;

  if (!markets || markets.length === 0) {
    return <EmptyState title="Aucun marché trouvé" description="Essayez d'ajuster vos filtres" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
};
