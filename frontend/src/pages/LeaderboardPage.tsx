import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersAPI } from '@/api/users';
import { LeaderboardIcon, RankIcon } from '@/components/shared/icons';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { formatPoints } from '@/utils/points';

const rankIconClassName: Record<number, string> = {
  1: 'text-secondary-foreground',
  2: 'text-primary',
  3: 'text-accent',
};

export const LeaderboardPage = () => {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', { offset, limit }],
    queryFn: () => usersAPI.fetchLeaderboard({ offset, limit }),
  });

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <LeaderboardIcon className="size-8 text-primary" />
          <span>Classement</span>
        </h1>
        <p className="text-muted-foreground">Meilleurs gagnants de points</p>
      </div>

      <div className="app-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary/20 bg-secondary">
              <th className="px-4 py-3 text-left text-sm font-semibold">Rang</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Utilisateur</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((entry) => (
              <tr key={entry.id} className="border-b border-primary/10 hover:bg-secondary transition-colors">
                <td className="px-4 py-3 text-sm font-semibold">
                  {entry.rank <= 3 && (
                    <RankIcon className={rankIconClassName[entry.rank]} />
                  )}
                  {entry.rank > 3 && `#${entry.rank}`}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/profile/${entry.id}`} className="text-primary hover:underline">
                    {entry.username}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatPoints(entry.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total > limit && (
        <PaginationControls
          offset={offset}
          limit={limit}
          total={data.total}
          onOffsetChange={setOffset}
        />
      )}
    </div>
  );
};
