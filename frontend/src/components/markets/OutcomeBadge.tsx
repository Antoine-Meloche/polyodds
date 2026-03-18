const colors = [
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-yellow-100 text-yellow-800',
  'bg-pink-100 text-pink-800',
];

export const OutcomeBadge = ({ outcome, index }: { outcome: string; index: number }) => {
  const colorClass = colors[index % colors.length];
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {outcome}
    </span>
  );
};
