import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  subtitleUrl?: string;
  title: string;
  onClose: () => void;
}

export function VideoPlayer({ src, subtitleUrl, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const containerRef = useRef<HTMLDivElement>(null!);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setIsReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setHasError(false);

    const initPlayer = () => {
      if (src.includes('m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setHasError(true);
              setIsLoading(false);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      } else {
        video.src = src;
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const handlePlay = () => {
    void videoRef.current?.play();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const showReadyOverlay = isReady && !isPlaying && !hasError;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className={`shrink-0 bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-white font-semibold truncate">{title}</h2>
          <div className="w-10" />
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          controls
          autoPlay
          playsInline
          crossOrigin="anonymous"
          onLoadedMetadata={() => {
            setIsReady(true);
            setIsLoading(false);
          }}
          onCanPlay={() => {
            setIsReady(true);
            setIsLoading(false);
            setIsBuffering(false);
          }}
          onLoadedData={() => {
            setIsReady(true);
            setIsLoading(false);
            setIsBuffering(false);
          }}
          onPlaying={() => {
            setIsReady(true);
            setIsPlaying(true);
            setIsBuffering(false);
            setIsLoading(false);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => {
            if (!videoRef.current?.paused) setIsBuffering(true);
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        >
          {subtitleUrl && (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang="en"
              label="English"
              default
            />
          )}
        </video>

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">Loading stream...</p>
            </div>
          </div>
        )}

        {isBuffering && !isLoading && !hasError && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {showReadyOverlay && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label="Play"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-[2px]"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/90 text-white shadow-lg shadow-primary/40 transition-transform hover:scale-105">
              <svg className="ml-1 h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium text-white">
              Ready to play
            </span>
          </button>
        )}

        {hasError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-white font-medium">Stream unavailable</p>
              <p className="text-neutral-400 text-sm">This video format is not supported by your browser.</p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-surface hover:bg-surface/80 text-white rounded-lg transition-colors text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
