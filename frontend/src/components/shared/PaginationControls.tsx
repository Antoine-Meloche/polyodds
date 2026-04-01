export const PaginationControls = ({
  offset,
  limit,
  total,
  onOffsetChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
}) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <button
        onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        disabled={offset === 0}
        className="px-4 py-2 border border-primary/25 rounded-lg disabled:opacity-50 hover:bg-secondary"
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onOffsetChange(offset + limit)}
        disabled={offset + limit >= total}
        className="px-4 py-2 border border-primary/25 rounded-lg disabled:opacity-50 hover:bg-secondary"
      >
        Next
      </button>
    </div>
  );
};
