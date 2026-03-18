import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BrandIcon } from '@/components/shared/icons';
import { PointsBadge } from '@/components/shared/PointsBadge';

export const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg">
          <BrandIcon className="text-primary" />
          <span>PolyOdds</span>
        </Link>

        <div className="flex-1 px-8">
          <input
            type="text"
            placeholder="Rechercher des bets..."
            className="w-full max-w-md px-3 py-2 border rounded-lg text-sm bg-secondary"
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
                className="px-3 py-1 text-sm border rounded-lg hover:bg-secondary"
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
              <Link to="/register" className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
