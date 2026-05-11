import { useAppStore } from '../store';

export function ResultsList() {
  const { searchResults, selectedResult, setSelectedResult, searchError, isSearching, searchQuery } = useAppStore();

  if (!searchQuery.trim() && searchResults.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-neutral-500">
        <div className="text-center">
          <p className="mb-2 text-xl font-semibold text-neutral-300">Search for anime</p>
          <p className="text-sm">Type a title to find anime to watch.</p>
        </div>
      </div>
    );
  }

  if (isSearching && searchResults.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-neutral-500">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Searching...</p>
        </div>
      </div>
    );
  }

  if (searchError) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 p-10 text-red-300">
        <div className="text-center">
          <p className="mb-2 text-xl font-semibold">Search failed</p>
          <p className="text-sm">{searchError}</p>
        </div>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-neutral-500">
        <div className="text-center">
          <p className="mb-2 text-xl font-semibold text-neutral-300">No results found</p>
          <p className="text-sm">Try a different search term.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-3 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-3 flex items-center justify-between px-2 text-sm text-neutral-400">
        <span>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</span>
        <span>Click a title to choose episode and quality</span>
      </div>
      <div className="grid gap-3">
        {searchResults.map((result) => (
          <button
            key={result.id}
            onClick={() => setSelectedResult(result)}
            className={`group w-full rounded-2xl border p-4 text-left transition-all ${
              selectedResult?.id === result.id
                ? 'border-blue-400 bg-blue-500/20 text-white shadow-lg shadow-blue-950/30'
                : 'border-white/10 bg-white/[0.04] text-neutral-200 hover:border-blue-400/50 hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-950 text-sm font-semibold text-neutral-400 ring-1 ring-white/10 group-hover:text-blue-200">
                {result.index}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{result.title}</p>
                {result.source_title !== result.title && (
                  <p className="truncate text-sm text-neutral-400">{result.source_title}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}