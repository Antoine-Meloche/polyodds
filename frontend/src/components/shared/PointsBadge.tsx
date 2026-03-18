import { formatPoints } from '@/utils/points';
import { PointsIcon } from '@/components/shared/icons';

interface PointsBadgeProps {
  points: number;
}

export const PointsBadge = ({ points }: PointsBadgeProps) => (
  <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-sm font-medium">
    <PointsIcon className="text-amber-600" />
    <span>{formatPoints(points)}</span>
  </div>
);
