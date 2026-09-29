import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppBackground } from './components/AppBackground';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ResultsList } from './components/ResultsList';
import { DetailPanel } from './components/DetailPanel';
import { VideoPlayer } from './components/VideoPlayer';
import { Toaster } from './components/Toaster';
import { CliStatus } from './components/CliStatus';
import { History } from './pages/History';
import { useAppStore } from './store';

function Home() {
  const { selectedResult } = useAppStore();

  return (
    <div className="relative z-10 flex min-h-screen flex-col text-text">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-highlight">Desktop anime player</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Watch anime. Nothing else in the way.</h1>
          <p className="mt-3 text-sm text-neutral-400 sm:text-base">Search, pick an episode, play. Sub or dub.</p>
        </div>
        <SearchBar />
        <ResultsList />
      </main>
      {selectedResult && <DetailPanel />}
    </div>
  );
}

function App() {
  const { streamInfo, clearStreamInfo, hydrate } = useAppStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <HashRouter>
      <AppBackground />
      <CliStatus />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
      </Routes>
      {streamInfo && (
        <VideoPlayer
          src={streamInfo.url}
          subtitleUrl={streamInfo.subtitleUrl}
          title={streamInfo.title}
          onClose={clearStreamInfo}
        />
      )}
      <Toaster />
    </HashRouter>
  );
}

export default App;
