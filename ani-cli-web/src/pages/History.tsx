import { Link } from 'react-router-dom';
import { useAppStore } from '../store';

export function History() {
  const { history, clearHistory } = useAppStore();

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-neutral-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-white">History</h1>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <p className="text-xl mb-2">No history</p>
            <p className="text-sm">Start watching to see your history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-sm text-neutral-400">
                    Episode {item.episode} • {item.quality}p • {item.mode}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {formatTime(item.played_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}