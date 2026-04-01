import { Link } from 'react-router-dom';
import type { Market } from '@/types';
import { getMarketStatusLabelFr } from '@/utils/marketStatus';
import { OutcomeBadge } from './OutcomeBadge';

interface MarketCardProps {
  market: Market;
}

export const MarketCard = ({ market }: MarketCardProps) => {
  return (
    <Link to={`/bets/${market.id}`}>
      <div className="app-panel p-4 hover:shadow-[0_18px_30px_rgba(87,104,175,0.16)] transition-shadow h-full">
        <div className="space-y-3">
          <h3 className="font-semibold line-clamp-2">{market.title}</h3>

          <p className="text-sm text-muted-foreground line-clamp-2">{market.description}</p>

          <div className="flex gap-2 flex-wrap">
            {market.outcomes.map((outcome, index) => (
              <OutcomeBadge key={index} outcome={outcome} index={index} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-primary/15 text-xs text-muted-foreground">
            <span>Statut: {getMarketStatusLabelFr(market.status)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
