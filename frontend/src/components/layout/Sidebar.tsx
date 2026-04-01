import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { marketsAPI } from '@/api/markets';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardIcon, MarketsIcon } from '@/components/shared/icons';

export const Sidebar = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: marketsData } = useQuery({
    queryKey: ['markets', 'sidebar', 'mine', user?.id],
    queryFn: () => marketsAPI.fetchMarkets({ limit: 200, offset: 0, sort: 'newest' }),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const myMarkets = (marketsData?.markets || []).filter((market) => market.creator_id === user?.id);
  const activeOwnMarketsCount = myMarkets.filter((market) => market.status === 'open').length;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="w-64 border-r border-primary/20 bg-card/80 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto backdrop-blur-sm">
      <div className="p-4 space-y-6">
        {/* Navigation */}
        <nav className="space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${(isActive('/') || (isActive('/bets') && location.pathname !== '/bets/create')) ? 'bg-primary text-primary-foreground font-semibold shadow-[0_8px_18px_rgba(87,104,175,0.28)]' : 'hover:bg-secondary'}`}
          >
            <MarketsIcon className="size-4 shrink-0" />
            <span>Marchés</span>
          </Link>
          <Link
            to="/leaderboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive('/leaderboard') ? 'bg-primary text-primary-foreground font-semibold shadow-[0_8px_18px_rgba(87,104,175,0.28)]' : 'hover:bg-secondary'}`}
          >
            <LeaderboardIcon className="size-4 shrink-0" />
            <span>Classement</span>
          </Link>
        </nav>

        {isAuthenticated && (
          <div className="border-t border-primary/15 pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Mes marchés</h3>
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {activeOwnMarketsCount}
              </span>
            </div>

            <div className="space-y-1">
              {myMarkets.length > 0 ? (
                myMarkets.slice(0, 10).map((market) => (
                  <Link
                    key={market.id}
                    to={`/bets/${market.id}`}
                    className={`block px-3 py-1.5 text-sm rounded truncate ${location.pathname === `/bets/${market.id}` ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    title={market.title}
                  >
                    {market.title}
                  </Link>
                ))
              ) : (
                <p className="px-3 py-1.5 text-sm text-muted-foreground">Aucun marché personnel</p>
              )}
            </div>
          </div>
        )}

        {/* Create Actions */}
        <div className="border-t border-primary/15 pt-4 space-y-2">
          <Link
            to="/bets/create"
            className="block px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 text-center font-medium shadow-[0_10px_20px_rgba(87,104,175,0.26)]"
          >
            + Créer un marché
          </Link>
        </div>
      </div>
    </aside>
  );
};
