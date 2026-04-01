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
      alert('Veuillez entrer un nom de communauté');
      return;
    }
    createMutation.mutate();
  };

  if (!isAuthenticated) {
    return <div className="text-center py-12 text-muted-foreground">Veuillez vous connecter pour créer une communauté</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Créer une communauté</h1>
        <p className="text-muted-foreground">Faites des bets sur des insides</p>
      </div>

      <form onSubmit={handleSubmit} className="app-panel p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Nom de la communauté *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Société technique PolyOrbite"
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
            placeholder="C'est quoi les bets de cette communauté?"
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
            Communauté privée (seuls les membres invités peuvent rejoindre)
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
        >
          {createMutation.isPending ? 'Création en cours...' : 'Créer la communauté'}
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
