import { useState } from 'react';
import { Header } from '../components/Header';
import { useAppStore } from '../store';
import { playAnime } from '../lib/api';
import { toast } from '../lib/toast';
import type { HistoryItem } from '../lib/types';

function formatTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function History() {
  const { history, removeFromHistory, clearHistory, setStreamInfo } = useAppStore();
  const [resumingId, setResumingId] = useState<number | null>(null);

  const handleResume = async (item: HistoryItem) => {
    if (resumingId !== null) return;
    setResumingId(item.id);
    toast.info(`Resuming ${item.title}...`);

    try {
      const result = await playAnime(item.anime_id, item.title, item.episode, item.quality, item.mode);
      if (result.status === 'success' && result.url) {
        setStreamInfo({ url: result.url, subtitleUrl: result.subtitle_url, title: item.title });
      } else {
        toast.error(result.error || 'Could not resume this title');
      }
    } catch {
      toast.error('Could not resume this title');
    } finally {
      setResumingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col text-neutral-100">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">History</h1>
            <p className="mt-1 text-sm text-neutral-400">Pick up where you left off.</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => void clearHistory()}
              className="rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-300 transition-colors hover:border-red-400/60 hover:text-red-200"
            >
              Clear all
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-16 text-center text-neutral-500">
            <p className="mb-2 text-xl font-semibold text-neutral-300">No history yet</p>
            <p className="text-sm">Start watching and your titles will show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Episode {item.episode} · {item.quality === 'best' ? 'Best' : `${item.quality}p`} · {item.mode}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{formatTime(item.played_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void handleResume(item)}
                    disabled={resumingId === item.id}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
                  >
                    {resumingId === item.id ? 'Loading...' : 'Resume'}
                  </button>
                  <button
                    onClick={() => void removeFromHistory(item.id)}
                    aria-label="Remove from history"
                    className="rounded-xl p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
