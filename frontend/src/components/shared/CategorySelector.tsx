import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category } from '@/types';

interface CategorySelectorProps {
  categories: Category[];
  selectedIds: string[];
  onToggleCategory: (categoryId: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  clearLabel?: string;
  onClear?: () => void;
  onDeleteCategory?: (categoryId: string, categoryName: string) => void;
  deleteDisabled?: boolean;
  className?: string;
}

const getSelectionLabel = (categories: Category[], selectedIds: string[], placeholder: string) => {
  if (selectedIds.length === 0) return placeholder;

  const namesById = new Map(categories.map((category) => [category.id, category.name]));
  const selectedNames = selectedIds
    .map((id) => namesById.get(id))
    .filter((name): name is string => Boolean(name));

  if (selectedNames.length <= 2) {
    return selectedNames.join(', ');
  }

  return `${selectedNames.length} categories selectionnees`;
};

export const CategorySelector = ({
  categories,
  selectedIds,
  onToggleCategory,
  placeholder,
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucune categorie trouvee.',
  clearLabel,
  onClear,
  onDeleteCategory,
  deleteDisabled = false,
  className,
}: CategorySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const orderedCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = normalizedSearch
      ? categories.filter((category) => category.name.toLowerCase().includes(normalizedSearch))
      : categories;

    return [...filtered].sort((left, right) => {
      const leftSelected = selectedIds.includes(left.id);
      const rightSelected = selectedIds.includes(right.id);

      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }

      return left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' });
    });
  }, [categories, search, selectedIds]);

  const selectionLabel = useMemo(
    () => getSelectionLabel(categories, selectedIds, placeholder),
    [categories, placeholder, selectedIds]
  );

  return (
    <div ref={containerRef} className={className}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/25 bg-background px-3 py-2 text-left text-sm"
        >
          <span className={selectedIds.length ? 'text-foreground' : 'text-muted-foreground'}>{selectionLabel}</span>
          <span className="text-xs text-muted-foreground">{isOpen ? 'Fermer' : 'Choisir'}</span>
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-2 w-full space-y-3 rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />

            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {onClear && clearLabel && (
                <button
                  type="button"
                  onClick={onClear}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedIds.length === 0
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary/25 bg-background hover:border-primary'
                  }`}
                >
                  {clearLabel}
                </button>
              )}

              {orderedCategories.map((category) => {
                const isSelected = selectedIds.includes(category.id);

                return (
                  <div key={category.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleCategory(category.id)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-primary/25 bg-background hover:border-primary'
                      }`}
                    >
                      {category.name}
                    </button>

                    {onDeleteCategory && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(category.id, category.name)}
                        disabled={deleteDisabled}
                        className="rounded-lg border border-destructive/40 px-2 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                );
              })}

              {orderedCategories.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">{emptyMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};