import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

export function ResultsList() {
  const {
    searchResults,
    selectedResult,
    setSelectedResult,
    searchError,
    isSearching,
    searchQuery
  } = useAppStore();
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchResults]);

  const showSkeleton = isSearching;

  if (!showSkeleton && !searchQuery.trim() && searchResults.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-neutral-500">
        <div className="text-center">
          <p className="mb-2 text-xl font-semibold text-neutral-300">Search</p>
          <p className="text-sm">Type a title to start.</p>
        </div>
      </div>
    );
  }

  if (showSkeleton && searchResults.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-surface/55 p-3 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.07]" />
              </div>
            </div>
          ))}
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, searchResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      setSelectedResult(searchResults[activeIndex]);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-surface/55 p-3 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-3 flex items-center justify-between px-2 text-sm text-neutral-400">
        <span>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid gap-3" role="listbox" tabIndex={0} onKeyDown={handleKeyDown} aria-label="Search results">
        {searchResults.map((result, index) => (
          <button
            key={result.id}
            role="option"
            aria-selected={selectedResult?.id === result.id || activeIndex === index}
            onClick={() => setSelectedResult(result)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`group w-full rounded-2xl border p-4 text-left transition-all ${
              selectedResult?.id === result.id || activeIndex === index
                ? 'border-primary bg-primary/20 text-white shadow-lg shadow-primary/20'
                : 'border-white/10 bg-white/[0.04] text-neutral-200 hover:border-primary/50 hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background text-sm font-semibold text-neutral-400 ring-1 ring-white/10 group-hover:text-accent">
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
