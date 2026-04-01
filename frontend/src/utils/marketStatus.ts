import type { Market } from '@/types';

const MARKET_STATUS_LABELS_FR: Record<Market['status'], string> = {
  open: 'Ouvert',
  resolved: 'Résolu',
};

export const getMarketStatusLabelFr = (status: Market['status']): string => {
  return MARKET_STATUS_LABELS_FR[status];
};