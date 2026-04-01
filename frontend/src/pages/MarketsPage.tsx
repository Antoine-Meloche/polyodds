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
      <div className="app-panel p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Tous les bets</h1>
            <p className="text-sm text-muted-foreground mt-1">Recherchez et filtrez tous les marchés depuis cette page.</p>
          </div>
          <input
            type="text"
            placeholder="Rechercher un bet..."
            value={filters.search || ''}
            onChange={(e) =>
              handleFilterChange({
                ...filters,
                search: e.target.value || undefined,
              })
            }
            className="w-full max-w-xl px-3 py-2 border border-primary/25 rounded-lg text-sm bg-background"
          />
        </div>
      </div>

      <MarketFilters filters={{ ...filters, search: undefined }} onFiltersChange={(newFilters) => handleFilterChange({ ...newFilters, search: filters.search })} />

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
