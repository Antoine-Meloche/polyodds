import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  Award,
  ChartColumn,
  Coins,
  Dices,
  Gift,
  House,
  Lock,
  Trophy,
  Users,
} from 'lucide-react';

type AppIconProps = LucideProps;

const withDefaults = (Icon: LucideIcon, defaultClassName: string) => {
  const Component = ({ className, strokeWidth = 2, ...props }: AppIconProps) => (
    <Icon
      aria-hidden="true"
      className={[defaultClassName, className].filter(Boolean).join(' ')}
      strokeWidth={strokeWidth}
      {...props}
    />
  );

  Component.displayName = `${Icon.displayName ?? Icon.name}Icon`;

  return Component;
};

export const BrandIcon = withDefaults(Dices, 'size-5');
export const HomeIcon = withDefaults(House, 'size-4');
export const MarketsIcon = withDefaults(ChartColumn, 'size-4');
export const LeaderboardIcon = withDefaults(Trophy, 'size-4');
export const MembersIcon = withDefaults(Users, 'size-4');
export const PrivateIcon = withDefaults(Lock, 'size-4');
export const GiftIcon = withDefaults(Gift, 'size-6');
export const PointsIcon = withDefaults(Coins, 'size-4');
export const RankIcon = withDefaults(Award, 'size-4');