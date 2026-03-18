import { formatPoints } from './points';

export const formatProbability = (prob: number): string => {
  return `${(prob * 100).toFixed(1)}%`;
};

export const formatPayout = (stake: number, probability: number): string => {
  if (probability === 0) return '∞';
  const payout = stake / probability;
  return formatPoints(payout);
};

export const calculateOdds = (probability: number): number => {
  if (probability === 0) return Infinity;
  return (1 - probability) / probability;
};
