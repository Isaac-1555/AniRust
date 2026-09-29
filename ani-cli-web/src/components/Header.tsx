import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/anirust.png';

export function Header() {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `rounded-full border px-4 py-2 text-sm transition-colors ${
      pathname === path
        ? 'border-highlight/60 bg-highlight/15 text-white'
        : 'border-white/10 text-neutral-300 hover:border-highlight/50 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/75 px-5 py-3 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3 text-lg font-bold text-white transition-colors hover:text-highlight">
          <img
            src={logo}
            alt="AniRust"
            className="h-9 w-9 object-contain"
          />
          <span>AniRust</span>
        </Link>
        <nav className="flex gap-2">
          <Link to="/" className={linkClass('/')}>Search</Link>
          <Link to="/history" className={linkClass('/history')}>History</Link>
        </nav>
      </div>
    </header>
  );
}
