import { useState } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { MarketList } from '@/components/markets/MarketList';
import { MarketFilters, type MarketFiltersState } from '@/components/markets/MarketFilters';
import { PaginationControls } from '@/components/shared/PaginationControls';

export const MarketsPage = () => {
  const [filters, setFilters] = useState<MarketFiltersState & { limit: number; offset: number }>({
    limit: 12,
    offset: 0,
    sort: 'newest',
  });

  const { data, isLoading } = useMarkets(filters);

  const handleFilterChange = (newFilters: MarketFiltersState) => {
    setFilters({
      ...newFilters,
      limit: 12,
      offset: 0,
    } as typeof filters);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bets</h1>

      <MarketFilters filters={filters} onFiltersChange={handleFilterChange} />

      <MarketList markets={data?.markets || []} isLoading={isLoading} />

      {data && data.total > 12 && (
        <PaginationControls
          offset={(filters.offset || 0) as number}
          limit={(filters.limit || 12) as number}
          total={data.total}
          onOffsetChange={(newOffset) => setFilters({ ...filters, offset: newOffset } as typeof filters)}
        />
      )}
    </div>
  );
};
