export const formatPoints = (points: number): string => {
  if (points >= 1000000) {
    return (points / 1000000).toFixed(1) + 'M';
  }
  if (points >= 1000) {
    return (points / 1000).toFixed(1) + 'k';
  }
  return Math.floor(points).toString();
};

export const displayPoints = (points: number): string => {
  return formatPoints(points);
};
