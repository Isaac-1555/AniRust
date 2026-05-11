import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/45 px-5 py-4 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3 text-lg font-bold text-white transition-colors hover:text-blue-300">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30">ア</span>
          <span>Anickie</span>
        </Link>
        <nav className="flex gap-4">
          <Link
            to="/history"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-blue-400/50 hover:text-white"
          >
            History
          </Link>
        </nav>
      </div>
    </header>
  );
}