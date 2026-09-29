import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { playAnime, getEpisodes } from '../lib/api';
import { toast } from '../lib/toast';

const QUALITIES = [
  { value: 'best', label: 'Best available' },
  { value: '1080', label: '1080p' },
  { value: '720', label: '720p' },
  { value: '480', label: '480p' },
  { value: '360', label: '360p' },
  { value: 'worst', label: 'Worst' },
];

export function DetailPanel() {
  const {
    selectedResult,
    setSelectedResult,
    episode,
    setEpisode,
    quality,
    setQuality,
    mode,
    setMode,
    isPlaying,
    setIsPlaying,
    addToHistory,
    setStreamInfo
  } = useAppStore();

  const [episodes, setEpisodes] = useState<number[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesError, setEpisodesError] = useState<string | null>(null);

  const resultId = selectedResult?.id;

  useEffect(() => {
    if (!resultId) {
      setEpisodes([]);
      setEpisodesError(null);
      return;
    }

    let cancelled = false;
    setEpisodesLoading(true);
    setEpisodesError(null);

    getEpisodes(resultId, mode)
      .then((response) => {
        if (cancelled) return;
        const parsed = response.episodes
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isFinite(value));
        setEpisodes(parsed);
        if (parsed.length > 0 && !parsed.includes(episode)) {
          setEpisode(parsed[0]);
        }
        if (parsed.length === 0) {
          setEpisodesError(response.error || 'No episodes found');
        }
      })
      .catch(() => {
        if (!cancelled) setEpisodesError('Failed to load episodes');
      })
      .finally(() => {
        if (!cancelled) setEpisodesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resultId, mode]);

  if (!selectedResult) {
    return null;
  }

  const handlePlay = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    toast.info('Resolving stream...');

    try {
      const result = await playAnime(selectedResult.id, selectedResult.title, episode, quality, mode);

      if (result.status === 'success' && result.url) {
        setStreamInfo({
          url: result.url,
          subtitleUrl: result.subtitle_url,
          title: selectedResult.title
        });
        addToHistory({
          anime_id: selectedResult.id,
          title: selectedResult.title,
          episode,
          quality,
          mode,
          played_at: Date.now()
        });
        setSelectedResult(null);
      } else {
        toast.error(result.error || 'Failed to get stream URL');
      }
    } catch {
      toast.error('Failed to play');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setSelectedResult(null)}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-surface/95 p-6 shadow-2xl shadow-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{selectedResult.title}</h2>
            {selectedResult.source_title !== selectedResult.title && (
              <p className="text-sm text-neutral-400 mt-1">{selectedResult.source_title}</p>
            )}
          </div>
          <button
            onClick={() => setSelectedResult(null)}
            aria-label="Close"
            className="rounded-xl p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Episode</label>
            {episodesLoading ? (
              <div className="h-[52px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            ) : episodes.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <div className="grid grid-cols-5 gap-2">
                  {episodes.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEpisode(value)}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                        episode === value
                          ? 'bg-primary text-white'
                          : 'bg-white/[0.04] text-neutral-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  min="1"
                  value={episode}
                  onChange={(e) => setEpisode(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
                />
                {episodesError && (
                  <p className="mt-2 text-xs text-amber-300/80">{episodesError}. Enter an episode manually.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              {QUALITIES.map((option) => (
                <option key={option.value} value={option.value} className="bg-neutral-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-3">Mode</label>
            <div className="flex gap-3">
              {(['sub', 'dub'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium capitalize transition-all ${
                    mode === value
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setSelectedResult(null)}
            className="flex-1 rounded-xl bg-white/[0.08] px-4 py-3 font-medium text-white transition-all hover:bg-white/[0.12] active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:bg-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Play
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
