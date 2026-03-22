interface PaginationProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (n: number) => void;
}

export function Pagination({ page, totalPages, loading, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const btnClass = "px-3 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 pt-6 mt-8">
      <div className="flex items-center gap-2">
        <button disabled={loading || page <= 1} onClick={() => onPageChange(1)} className={btnClass}>First</button>
        <button disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)} className={btnClass}>Prev</button>
        <button disabled={loading || page >= totalPages} onClick={() => onPageChange(page + 1)} className={btnClass}>Next</button>
        <button disabled={loading || page >= totalPages} onClick={() => onPageChange(totalPages)} className={btnClass}>Last</button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onPageChange(Number((e.target as HTMLInputElement).value));
              }
            }}
   
className="w-20 rounded-md border border-slate-300 px-2 py-2 text-base sm:text-sm outline-none..."
          />
        </div>
      </div>
    </div>
  );
}