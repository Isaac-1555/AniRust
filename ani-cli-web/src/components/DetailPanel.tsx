import { useAppStore } from '../store';
import { playAnime } from '../lib/api';

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

  if (!selectedResult) {
    return null;
  }


  const handlePlay = async () => {
    if (isPlaying) return;

    setIsPlaying(true);

    try {
      const result = await playAnime(selectedResult.id, selectedResult.title, episode, quality, mode);

      if (result.status === 'success' && result.url) {
        setStreamInfo({ url: result.url, title: selectedResult.title });
        addToHistory({
          id: Date.now(),
          anime_id: selectedResult.id,
          title: selectedResult.title,
          episode,
          quality,
          mode,
          played_at: Date.now()
        });
        setSelectedResult(null);
      } else {
        alert(result.error || 'Failed to get stream URL');
      }
    } catch (err) {
      alert('Failed to play');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setSelectedResult(null)}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl shadow-black"
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
            <input
              type="number"
              min="1"
              value={episode}
              onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
            >
              <option value="best">Best</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="worst">Worst</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-3">Mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('sub')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  mode === 'sub'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                    : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]'
                }`}
              >
                Sub
              </button>
              <button
                type="button"
                onClick={() => setMode('dub')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  mode === 'dub'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                    : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]'
                }`}
              >
                Dub
              </button>
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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