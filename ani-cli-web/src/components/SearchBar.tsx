import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { searchAnime } from '../lib/api';

const MIN_QUERY_LENGTH = 2;

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const seqRef = useRef(0);

  const {
    mode,
    setSearchResults,
    setIsSearching,
    setSearchError,
    setSelectedResult,
    setSearchQuery,
    isSearching
  } = useAppStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const term = debouncedQuery.trim();
    const seq = ++seqRef.current;
    setSearchQuery(term);

    if (term.length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSelectedResult(null);

    searchAnime(term, mode)
      .then((response) => {
        if (seq !== seqRef.current) return;

        if (response.status === 'error') {
          setSearchError(response.error || 'Search failed');
          setSearchResults([]);
        } else if (response.status === 'empty') {
          setSearchResults([]);
          setSearchError('No results found');
        } else {
          setSearchResults(response.results);
        }
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        setSearchError('Failed to search');
        setSearchResults([]);
      })
      .finally(() => {
        if (seq === seqRef.current) setIsSearching(false);
      });
  }, [debouncedQuery, mode, setSearchResults, setIsSearching, setSearchError, setSelectedResult, setSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-black/30 backdrop-blur">
        <svg className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime title..."
          aria-label="Search anime title"
          className="w-full rounded-xl border border-transparent bg-neutral-950/80 py-4 pl-12 pr-14 text-base text-white placeholder-neutral-500 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25 sm:text-lg"
        />
        {isSearching && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </form>
  );
}
