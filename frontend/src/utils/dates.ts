export const formatClosingTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

export const formatRelative = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return 'Closed';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'closing soon';
  if (diffMins < 60) return `${diffMins}m left`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h left`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d left`;
};

export const isClosingSoon = (isoString: string): boolean => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return diffMs < 60 * 60 * 1000; // 1 hour
};
