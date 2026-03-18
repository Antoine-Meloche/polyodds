import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoriesAPI } from '@/api/categories';
import { marketsAPI } from '@/api/markets';
import { communitiesAPI } from '@/api/communities';
import { useAuth } from '@/hooks/useAuth';

export const CreateMarketPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [outcomes, setOutcomes] = useState(['Yes', 'No']);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.fetchCategories(),
  });

  const { data: communities } = useQuery({
    queryKey: ['communities', { limit: 100 }],
    queryFn: () => communitiesAPI.fetchCommunities({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      marketsAPI.createMarket({
        title,
        description,
        category_id: categoryId,
        community_id: communityId || null,
        outcomes,
      }),
    onSuccess: (market) => {
      navigate(`/markets/${market.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !categoryId || outcomes.length < 2) {
      alert('Please fill all required fields');
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
    return <div className="text-center py-12 text-muted-foreground">Please login to create a market</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Market</h1>
        <p className="text-muted-foreground">Create a new prediction market</p>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-card space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Will Bitcoin reach $100k by end of year?"
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
            placeholder="Provide details about this market..."
            className="w-full px-3 py-2 border rounded-lg h-24"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">Category *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select a category</option>
            {categories?.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Community */}
        <div>
          <label className="block text-sm font-medium mb-2">Community (Optional)</label>
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">No community</option>
            {communities?.communities.map((com) => (
              <option key={com.id} value={com.id}>
                {com.name}
              </option>
            ))}
          </select>
        </div>

        {/* Outcomes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Outcomes *</label>
            <button
              type="button"
              onClick={addOutcome}
              className="text-xs text-primary hover:underline"
            >
              + Add Outcome
            </button>
          </div>
          <div className="space-y-2">
            {outcomes.map((outcome, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  required
                />
                {outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                  >
                    Remove
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
          {createMutation.isPending ? 'Creating...' : 'Create Market'}
        </button>

        {createMutation.error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {(createMutation.error as any).message}
          </div>
        )}
      </form>
    </div>
  );
};
