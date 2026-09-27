import { invoke } from '@tauri-apps/api/core';
import type { SearchResponse, PlayResult, EpisodesResponse } from './types';

export async function searchAnime(query: string, mode: string): Promise<SearchResponse> {
  return await invoke<SearchResponse>('search_anime', { query, mode });
}

export async function playAnime(
  animeId: string,
  animeTitle: string,
  episode: number | null,
  quality: string,
  mode: string
): Promise<PlayResult> {
  return await invoke<PlayResult>('play_anime', {
    animeId,
    animeTitle,
    episode,
    quality,
    mode
  });
}

export async function getEpisodes(animeId: string, mode: string): Promise<EpisodesResponse> {
  return await invoke<EpisodesResponse>('get_episodes', { animeId, mode });
}

export async function checkAniCli(): Promise<boolean> {
  return await invoke<boolean>('check_ani_cli');
}

export async function getCliVersion(): Promise<string> {
  return await invoke<string>('get_cli_version');
}