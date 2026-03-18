import { Link } from 'react-router-dom';
import type { Community } from '@/types';

export const CommunityCard = ({ community }: { community: Community }) => {
  return (
    <Link to={`/communities/${community.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-card">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold line-clamp-1">{community.name}</h3>
            {community.is_private && <span className="text-xs bg-secondary px-2 py-1 rounded">Private</span>}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{community.description}</p>

          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>👥 {community.member_count || 0} members</span>
            <span>📊 {community.market_count || 0} markets</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
