import { Link } from 'react-router-dom';
import type { Market } from '@/types';
import { formatRelative } from '@/utils/dates';
import { OutcomeBadge } from './OutcomeBadge';

interface MarketCardProps {
  market: Market;
}

export const MarketCard = ({ market }: MarketCardProps) => {
  return (
    <Link to={`/markets/${market.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow h-full bg-card">
        <div className="space-y-3">
          <h3 className="font-semibold line-clamp-2">{market.title}</h3>

          <p className="text-sm text-muted-foreground line-clamp-2">{market.description}</p>

          <div className="flex gap-2 flex-wrap">
            {market.outcomes.map((outcome, index) => (
              <OutcomeBadge key={index} outcome={outcome} index={index} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>{formatRelative(market.created_at)}</span>
            <span>Status: {market.status}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
