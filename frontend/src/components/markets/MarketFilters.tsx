import { useQuery } from '@tanstack/react-query';
import { categoriesAPI } from '@/api/categories';

export interface MarketFiltersState {
  category_id?: string;
  status?: 'open' | 'closed' | 'resolved';
  sort?: 'volume' | 'newest';
  search?: string;
}

export const MarketFilters = ({
  filters,
  onFiltersChange,
}: {
  filters: MarketFiltersState;
  onFiltersChange: (filters: MarketFiltersState) => void;
}) => {
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.fetchCategories(),
  });

  return (
    <div className="flex gap-4 flex-wrap">
      <select
        value={filters.category_id || ''}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            category_id: e.target.value || undefined,
          })
        }
        className="px-3 py-2 border rounded-lg text-sm bg-background"
      >
        <option value="">All Categories</option>
        {categoriesData?.categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={filters.status || ''}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            status: (e.target.value as any) || undefined,
          })
        }
        className="px-3 py-2 border rounded-lg text-sm bg-background"
      >
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
        <option value="resolved">Resolved</option>
      </select>

      <select
        value={filters.sort || 'newest'}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            sort: (e.target.value as any) || 'newest',
          })
        }
        className="px-3 py-2 border rounded-lg text-sm bg-background"
      >
        <option value="newest">Newest</option>
        <option value="volume">Volume</option>
      </select>

      <input
        type="text"
        placeholder="Search..."
        value={filters.search || ''}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            search: e.target.value || undefined,
          })
        }
        className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[200px]"
      />
    </div>
  );
};
