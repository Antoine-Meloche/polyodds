const colors = [
  'bg-primary/15 text-primary border border-primary/35',
  'bg-secondary text-secondary-foreground border border-secondary-foreground/20',
  'bg-accent/18 text-accent-foreground border border-accent/40',
  'bg-destructive/12 text-destructive border border-destructive/30',
  'bg-muted text-foreground border border-primary/20',
  'bg-primary/10 text-foreground border border-primary/28',
];

export const OutcomeBadge = ({ outcome, index }: { outcome: string; index: number }) => {
  const colorClass = colors[index % colors.length];
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {outcome}
    </span>
  );
};
