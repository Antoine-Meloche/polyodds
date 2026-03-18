import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { communitiesAPI } from '@/api/communities';
import { useAuth } from '@/hooks/useAuth';

export const CreateCommunityPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      communitiesAPI.createCommunity({
        name,
        description,
        is_private: isPrivate,
      }),
    onSuccess: (community) => {
      navigate(`/communities/${community.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Please enter a community name');
      return;
    }
    createMutation.mutate();
  };

  if (!isAuthenticated) {
    return <div className="text-center py-12 text-muted-foreground">Please login to create a community</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Community</h1>
        <p className="text-muted-foreground">Build your prediction community</p>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-card space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Community Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Crypto Enthusiasts"
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
            placeholder="What is this community about?"
            className="w-full px-3 py-2 border rounded-lg h-24"
          />
        </div>

        {/* Privacy */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="private" className="text-sm font-medium">
            Private community (only invited members can join)
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Community'}
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
