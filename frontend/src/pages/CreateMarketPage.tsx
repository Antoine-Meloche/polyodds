import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '@/api/categories';
import { marketsAPI } from '@/api/markets';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { useAuth } from '@/hooks/useAuth';

export const CreateMarketPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [outcomes, setOutcomes] = useState(['Oui', 'Non']);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.fetchCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      marketsAPI.createMarket({
        title,
        description,
        category_ids: selectedCategoryIds,
        outcomes,
      }),
    onSuccess: (market) => {
      navigate(`/bets/${market.id}`);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const name = newCategoryName.trim();
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);

      if (!name || !slug) {
        throw new Error('Nom de catégorie invalide.');
      }

      return categoriesAPI.createCategory(name, slug);
    },
    onSuccess: async (createdCategory) => {
      setNewCategoryName('');
      setSelectedCategoryIds((prev) => (prev.includes(createdCategory.id) ? prev : [...prev, createdCategory.id]));
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await categoriesAPI.deleteCategory(categoryId);
      return categoryId;
    },
    onSuccess: async (deletedCategoryId) => {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== deletedCategoryId));
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || selectedCategoryIds.length === 0 || outcomes.length < 2) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createMutation.mutate();
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim() || createCategoryMutation.isPending) return;
    createCategoryMutation.mutate();
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (deleteCategoryMutation.isPending) return;

    const shouldDelete = window.confirm(`Supprimer la catégorie "${categoryName}" ?`);
    if (!shouldDelete) return;

    deleteCategoryMutation.mutate(categoryId);
  };

  const addOutcome = () => {
    setOutcomes([...outcomes, '']);
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  if (!isAuthenticated) {
    return <div className="text-center py-12 text-muted-foreground">Veuillez vous connecter pour créer un marché</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Créer un marché</h1>
        <p className="text-muted-foreground">Créez un nouveau marché de l'impertinence</p>
      </div>

      <form onSubmit={handleSubmit} className="app-panel p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: C'est quoi les odds de ?"
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fournissez des détails sur ce marché..."
            className="w-full px-3 py-2 border rounded-lg h-24"
          />
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">Catégories *</label>

          <CategorySelector
            categories={categories?.categories ?? []}
            selectedIds={selectedCategoryIds}
            onToggleCategory={toggleCategory}
            onDeleteCategory={handleDeleteCategory}
            deleteDisabled={deleteCategoryMutation.isPending}
            placeholder="Selectionner une ou plusieurs categories"
            searchPlaceholder="Rechercher une categorie..."
            emptyMessage="Aucune categorie trouvee."
          />

          <p className="text-xs text-muted-foreground">Sélectionnez une ou plusieurs catégories.</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Créer une nouvelle catégorie"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
              className="px-3 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 disabled:opacity-50"
            >
              {createCategoryMutation.isPending ? 'Création...' : 'Ajouter'}
            </button>
          </div>

          {createCategoryMutation.error && (
            <div className="text-destructive text-sm">{(createCategoryMutation.error as Error).message}</div>
          )}
          {deleteCategoryMutation.error && (
            <div className="text-destructive text-sm">{(deleteCategoryMutation.error as Error).message}</div>
          )}
        </div>

        {/* Outcomes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Résultats *</label>
            <button
              type="button"
              onClick={addOutcome}
              className="text-xs text-primary hover:underline"
            >
              + Ajouter un résultat
            </button>
          </div>
          <div className="space-y-2">
            {outcomes.map((outcome, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  placeholder={`Résultat ${index + 1}`}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  required
                />
                {outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(index)}
                    className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
        >
          {createMutation.isPending ? 'Création en cours...' : 'Créer le marché'}
        </button>

        {createMutation.error && (
          <div className="p-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-sm">
            {(createMutation.error as any).message}
          </div>
        )}
      </form>
    </div>
  );
};
