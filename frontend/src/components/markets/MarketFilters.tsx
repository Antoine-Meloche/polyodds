import { useQuery } from '@tanstack/react-query';
import { categoriesAPI } from '@/api/categories';
import { CategorySelector } from '@/components/shared/CategorySelector';

export interface MarketFiltersState {
  category_ids?: string[];
  status?: 'open' | 'resolved';
  sort?: 'volume' | 'newest';
  search?: string;
}

export const MarketFilters = ({
  filters,
  onFiltersChange,
  showSearch = true,
}: {
  filters: MarketFiltersState;
  onFiltersChange: (filters: MarketFiltersState) => void;
  showSearch?: boolean;
}) => {
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.fetchCategories(),
  });

  return (
    <div className="app-panel p-4 flex gap-4 flex-wrap">
      <CategorySelector
        className="min-w-[260px] flex-1"
        categories={categoriesData?.categories ?? []}
        selectedIds={filters.category_ids || []}
        onToggleCategory={(categoryId: string) => {
          const isSelected = !!filters.category_ids?.includes(categoryId);
          const next = isSelected
            ? (filters.category_ids || []).filter((id) => id !== categoryId)
            : [...(filters.category_ids || []), categoryId];

          onFiltersChange({
            ...filters,
            category_ids: next.length ? next : undefined,
          });
        }}
        onClear={() =>
          onFiltersChange({
            ...filters,
            category_ids: undefined,
          })
        }
        clearLabel="Toutes les categories"
        placeholder="Toutes les categories"
        searchPlaceholder="Filtrer les categories..."
        emptyMessage="Aucune categorie trouvee."
      />

      <select
        value={filters.status || ''}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            status: (e.target.value as any) || undefined,
          })
        }
        className="px-3 py-2 border border-primary/25 rounded-lg text-sm bg-background"
      >
        <option value="">Tous les statuts</option>
        <option value="open">Ouvert</option>
        <option value="resolved">Résolu</option>
      </select>

      <select
        value={filters.sort || 'newest'}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            sort: (e.target.value as any) || 'newest',
          })
        }
        className="px-3 py-2 border border-primary/25 rounded-lg text-sm bg-background"
      >
        <option value="newest">Plus récent</option>
        <option value="volume">Volume</option>
      </select>

      {showSearch && (
        <input
          type="text"
          placeholder="Rechercher..."
          value={filters.search || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              search: e.target.value || undefined,
            })
          }
          className="px-3 py-2 border border-primary/25 rounded-lg text-sm flex-1 min-w-[200px]"
        />
      )}
    </div>
  );
};
