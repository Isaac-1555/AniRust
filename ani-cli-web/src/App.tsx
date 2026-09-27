import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
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
    <div className="flex min-h-screen flex-col text-neutral-100">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-orange-300">Stream finder</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Find anime without leaving the app.</h1>
          <p className="mt-3 text-sm text-neutral-400 sm:text-base">Search, choose an episode, and watch the stream right inside Anickie.</p>
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
