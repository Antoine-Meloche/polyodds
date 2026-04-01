import { formatPoints } from '@/utils/points';
import { PointsIcon } from '@/components/shared/icons';

interface PointsBadgeProps {
  points: number;
}

export const PointsBadge = ({ points }: PointsBadgeProps) => (
  <div className="app-pill flex items-center gap-2 px-3 py-1 text-sm font-medium text-foreground">
    <PointsIcon className="text-accent" />
    <span>{formatPoints(points)}</span>
  </div>
);
