import { Link, useLocation } from 'react-router-dom';
import { LeaderboardIcon, MarketsIcon } from '@/components/shared/icons';

export const Sidebar = () => {
  const location = useLocation();

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
            <span>Tous les bets</span>
          </Link>
          <Link
            to="/leaderboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive('/leaderboard') ? 'bg-primary text-primary-foreground font-semibold shadow-[0_8px_18px_rgba(87,104,175,0.28)]' : 'hover:bg-secondary'}`}
          >
            <LeaderboardIcon className="size-4 shrink-0" />
            <span>Classement</span>
          </Link>
        </nav>

        {/* Create Actions */}
        <div className="border-t border-primary/15 pt-4 space-y-2">
          <Link
            to="/bets/create"
            className="block px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 text-center font-medium shadow-[0_10px_20px_rgba(87,104,175,0.26)]"
          >
            + Créer un bet
          </Link>
        </div>
      </div>
    </aside>
  );
};
