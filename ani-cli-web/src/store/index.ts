import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SearchResult, HistoryItem, StreamInfo } from '../lib/types';

interface AppState {
  searchQuery: string;
  searchResults: SearchResult[];
  selectedResult: SearchResult | null;
  isSearching: boolean;
  searchError: string | null;

  episode: number;
  quality: string;
  mode: string;

  streamInfo: StreamInfo | null;

  history: HistoryItem[];
  isPlaying: boolean;

  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSelectedResult: (result: SearchResult | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchError: (error: string | null) => void;

  setEpisode: (episode: number) => void;
  setQuality: (quality: string) => void;
  setMode: (mode: string) => void;

  setStreamInfo: (info: StreamInfo | null) => void;
  clearStreamInfo: () => void;

  addToHistory: (item: HistoryItem) => void;
  setHistory: (history: HistoryItem[]) => void;
  clearHistory: () => void;

  setIsPlaying: (isPlaying: boolean) => void;

  reset: () => void;
}

const initialState = {
  searchQuery: '',
  searchResults: [] as SearchResult[],
  selectedResult: null,
  isSearching: false,
  searchError: null,
  episode: 1,
  quality: 'best',
  mode: 'sub',
  streamInfo: null as StreamInfo | null,
  history: [] as HistoryItem[],
  isPlaying: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setSelectedResult: (result) => set({ selectedResult: result }),
      setIsSearching: (isSearching) => set({ isSearching }),
      setSearchError: (error) => set({ searchError: error }),

      setEpisode: (episode) => set({ episode }),
      setQuality: (quality) => set({ quality }),
      setMode: (mode) => set({ mode }),

      setStreamInfo: (info) => set({ streamInfo: info }),
      clearStreamInfo: () => set({ streamInfo: null }),

      addToHistory: (item) => set((state) => ({
        history: [item, ...state.history].slice(0, 50)
      })),
      setHistory: (history) => set({ history }),
      clearHistory: () => set({ history: [] }),

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      reset: () => set(initialState),
    }),
    {
      name: 'ani-cli-web-store',
      partialize: (state) => ({
        quality: state.quality,
        mode: state.mode,
        episode: state.episode,
        history: state.history,
      }),
    }
  )
);