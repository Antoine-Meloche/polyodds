import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesAPI } from '@/api/categories';
import { HomeIcon, LeaderboardIcon, MarketsIcon } from '@/components/shared/icons';
import { useCommunities } from '@/hooks/useCommunities';

export const Sidebar = () => {
  const location = useLocation();
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.fetchCategories(),
  });

  const { data: communitiesData } = useCommunities({ limit: 10 });

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="w-64 border-r bg-card sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Navigation */}
        <nav className="space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive('/') ? 'bg-secondary font-semibold' : 'hover:bg-secondary'}`}
          >
            <HomeIcon className="size-4 shrink-0" />
            <span>Home</span>
          </Link>
          <Link
            to="/markets"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive('/markets') && location.pathname !== '/markets/create' ? 'bg-secondary font-semibold' : 'hover:bg-secondary'}`}
          >
            <MarketsIcon className="size-4 shrink-0" />
            <span>All Markets</span>
          </Link>
          <Link
            to="/leaderboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive('/leaderboard') ? 'bg-secondary font-semibold' : 'hover:bg-secondary'}`}
          >
            <LeaderboardIcon className="size-4 shrink-0" />
            <span>Leaderboard</span>
          </Link>
        </nav>

        {/* Categories */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">Categories</h3>
          <div className="space-y-1">
            {categoriesData?.categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={`/markets?category_id=${cat.id}`}
                className="block px-3 py-1 text-sm rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Communities */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Communities</h3>
            <Link to="/communities" className="text-xs text-primary hover:underline">
              Browse
            </Link>
          </div>
          <div className="space-y-1">
            {communitiesData?.communities.slice(0, 5).map((com) => (
              <Link
                key={com.id}
                to={`/communities/${com.id}`}
                className="block px-3 py-1 text-sm rounded hover:bg-secondary text-muted-foreground hover:text-foreground truncate"
              >
                {com.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Create Actions */}
        <div className="border-t pt-4 space-y-2">
          <Link
            to="/markets/create"
            className="block px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 text-center font-medium"
          >
            + Create Market
          </Link>
          <Link
            to="/communities/create"
            className="block px-3 py-2 rounded-lg text-sm border hover:bg-secondary text-center font-medium"
          >
            + Create Community
          </Link>
        </div>
      </div>
    </aside>
  );
};
