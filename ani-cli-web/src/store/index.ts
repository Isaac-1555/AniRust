import { create } from 'zustand';
import type { SearchResult, HistoryItem, StreamInfo } from '../lib/types';
import {
  initDb,
  loadHistory,
  insertHistory,
  deleteHistoryItem,
  clearHistory as clearHistoryDb,
  loadPreferences,
  savePreference,
} from '../lib/db';

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

  hydrated: boolean;

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

  addToHistory: (item: Omit<HistoryItem, 'id'>) => Promise<void>;
  removeFromHistory: (id: number) => Promise<void>;
  clearHistory: () => Promise<void>;

  setIsPlaying: (isPlaying: boolean) => void;

  hydrate: () => Promise<void>;

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
  hydrated: false,
};

export const useAppStore = create<AppState>()((set, get) => ({
  ...initialState,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSelectedResult: (result) => set({ selectedResult: result }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchError: (error) => set({ searchError: error }),

  setEpisode: (episode) => set({ episode }),
  setQuality: (quality) => {
    set({ quality });
    void savePreference('quality', quality);
  },
  setMode: (mode) => {
    set({ mode });
    void savePreference('mode', mode);
  },

  setStreamInfo: (info) => set({ streamInfo: info }),
  clearStreamInfo: () => set({ streamInfo: null }),

  addToHistory: async (item) => {
    try {
      const saved = await insertHistory(item);
      set((state) => ({ history: [saved, ...state.history].slice(0, 100) }));
    } catch (err) {
      console.error('Failed to save history', err);
    }
  },
  removeFromHistory: async (id) => {
    try {
      await deleteHistoryItem(id);
      set((state) => ({ history: state.history.filter((entry) => entry.id !== id) }));
    } catch (err) {
      console.error('Failed to delete history item', err);
    }
  },
  clearHistory: async () => {
    try {
      await clearHistoryDb();
      set({ history: [] });
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      await initDb();
      const [history, prefs] = await Promise.all([loadHistory(), loadPreferences()]);
      set({
        history,
        quality: prefs.quality ?? get().quality,
        mode: prefs.mode ?? get().mode,
        hydrated: true,
      });
    } catch (err) {
      console.error('Failed to hydrate store', err);
      set({ hydrated: true });
    }
  },

  reset: () => set(initialState),
}));
