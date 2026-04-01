import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  Award,
  ChartColumn,
  Coins,
  Gift,
  House,
  Lock,
  Trophy,
  Users,
} from 'lucide-react';

type AppIconProps = LucideProps;

const classes = (...names: Array<string | undefined>) => names.filter(Boolean).join(' ');

const withDefaults = (Icon: LucideIcon, defaultClassName: string) => {
  const Component = ({ className, strokeWidth = 2, ...props }: AppIconProps) => (
    <Icon
      aria-hidden="true"
      className={classes(defaultClassName, className)}
      strokeWidth={strokeWidth}
      {...props}
    />
  );

  Component.displayName = `${Icon.displayName ?? Icon.name}Icon`;

  return Component;
};

export const BrandIcon = ({ className, ...props }: AppIconProps) => (
  <svg
    aria-hidden="true"
    className={classes('size-5', className)}
    fill="none"
    viewBox="0 0 64 64"
    {...props}
  >
    <defs>
      <linearGradient id="brandIconBg" x1="10" x2="54" y1="8" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#12304A" />
        <stop offset="1" stopColor="#0A1826" />
      </linearGradient>
      <linearGradient id="brandIconAccent" x1="18" x2="47" y1="44" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#6EE7B7" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" x="8" y="8" fill="url(#brandIconBg)" rx="16" />
    <path d="M18 45H46" stroke="#F8FAFC" strokeLinecap="round" strokeWidth="4" />
    <path d="M18 20V45" stroke="#F8FAFC" strokeLinecap="round" strokeWidth="4" />
    <path
      d="M22 35V45"
      stroke="#F8FAFC"
      strokeLinecap="round"
      strokeWidth="5"
    />
    <path
      d="M31 29V45"
      stroke="#F8FAFC"
      strokeLinecap="round"
      strokeWidth="5"
    />
    <path
      d="M40 24V45"
      stroke="#F8FAFC"
      strokeLinecap="round"
      strokeWidth="5"
    />
    <path
      d="M21 38L29.5 32L35.5 34.5L43 23"
      stroke="url(#brandIconAccent)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
    />
    <path
      d="M38 23H43V28"
      stroke="url(#brandIconAccent)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
    />
  </svg>
);

BrandIcon.displayName = 'BrandIcon';

export const HomeIcon = withDefaults(House, 'size-4');
export const MarketsIcon = withDefaults(ChartColumn, 'size-4');
export const LeaderboardIcon = withDefaults(Trophy, 'size-4');
export const MembersIcon = withDefaults(Users, 'size-4');
export const PrivateIcon = withDefaults(Lock, 'size-4');
export const GiftIcon = withDefaults(Gift, 'size-6');
export const PointsIcon = withDefaults(Coins, 'size-4');
export const RankIcon = withDefaults(Award, 'size-4');