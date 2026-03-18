export const formatClosingTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

export const isClosingSoon = (isoString: string): boolean => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return diffMs < 60 * 60 * 1000; // 1 hour
};
