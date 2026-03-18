import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersAPI } from '@/api/users';
import { LeaderboardIcon, RankIcon } from '@/components/shared/icons';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { formatPoints } from '@/utils/points';

const rankIconClassName: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-orange-700',
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
          <span>Leaderboard</span>
        </h1>
        <p className="text-muted-foreground">Top points earners</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-secondary">
              <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((entry) => (
              <tr key={entry.id} className="border-b hover:bg-secondary transition-colors">
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
