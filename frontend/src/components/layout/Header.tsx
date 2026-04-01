import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BrandIcon } from '@/components/shared/icons';
import { PointsBadge } from '@/components/shared/PointsBadge';

export const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-primary/25 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg">
          <BrandIcon className="text-primary" />
          <span>PolyOdds</span>
        </Link>

        <div className="flex-1 px-8">
          <input
            type="text"
            placeholder="Rechercher des bets..."
            className="w-full max-w-md px-3 py-2 border border-primary/20 rounded-lg text-sm bg-card/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && user && (
            <>
              <PointsBadge points={user.points} />
              <Link to={`/profile/${user.id}`} className="text-sm hover:underline">
                {user.username}
              </Link>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm border border-primary/25 rounded-lg hover:bg-secondary"
              >
                Se déconnecter
              </button>
            </>
          )}
          {!isAuthenticated && (
            <>
              <Link to="/login" className="text-sm hover:underline">
                Se connecter
              </Link>
              <Link to="/register" className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg shadow-[0_10px_20px_rgba(87,104,175,0.25)] hover:opacity-90">
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
