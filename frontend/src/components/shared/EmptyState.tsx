interface EmptyStateProps {
  title: string;
  description?: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="app-panel flex flex-col items-center justify-center py-12 text-center">
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
  </div>
);
