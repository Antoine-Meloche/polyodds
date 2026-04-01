import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoriesAPI } from '@/api/categories';
import { marketsAPI } from '@/api/markets';
import { useAuth } from '@/hooks/useAuth';

export const CreateMarketPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [outcomes, setOutcomes] = useState(['Yes', 'No']);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.fetchCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      marketsAPI.createMarket({
        title,
        description,
        category_id: categoryId,
        outcomes,
      }),
    onSuccess: (market) => {
      navigate(`/bets/${market.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !categoryId || outcomes.length < 2) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createMutation.mutate();
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
    return <div className="text-center py-12 text-muted-foreground">Veuillez vous connecter pour créer un bet</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Créer un bet</h1>
        <p className="text-muted-foreground">Créez un nouveau bet de prédiction académique</p>
      </div>

      <form onSubmit={handleSubmit} className="app-panel p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Quel sera la moyenne du promo 2025 en fin de session?"
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
            placeholder="Fournissez des détails sur ce bet..."
            className="w-full px-3 py-2 border rounded-lg h-24"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">Catégorie *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Sélectionnez une catégorie</option>
            {categories?.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
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
          {createMutation.isPending ? 'Création en cours...' : 'Create Bet'}
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
