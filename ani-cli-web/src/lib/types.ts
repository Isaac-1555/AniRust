export interface SearchResult {
  index: number;
  title: string;
  source_title: string;
  id: string;
}

export interface SearchResponse {
  status: string;
  query: string;
  results: SearchResult[];
  error?: string;
}

export interface PlayResult {
status: string;
url?: string;
error?: string;
}

export interface StreamInfo {
    url: string;
    title: string;
}

export interface HistoryItem {
  id: number;
  anime_id: string;
  title: string;
  episode: number;
  quality: string;
  mode: string;
  played_at: number;
}

export interface Preferences {
  quality: string;
  mode: string;
  player: string;
}