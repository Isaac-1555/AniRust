# Anickie

A fast desktop GUI for [`ani-cli`](https://github.com/pystardust/ani-cli), built with
Tauri 2 (Rust) + React. Search anime, pick an episode, and watch the stream directly
inside the app — no terminal pickers, no external player required.

## Features

- Debounced search with stale-result cancellation and keyboard navigation.
- Episode list and quality / sub / dub selection per title.
- In-app HLS + MP4 playback with subtitles.
- Local streaming proxy that injects the referrer/CORS headers browsers can't set.
- SQLite-backed history with one-click resume.

## Architecture

- **Frontend** — React 19, TypeScript, Tailwind v4, Zustand (`src/`).
- **Backend** — Rust Tauri commands that shell out to the bundled, patched `ani-cli`
  (`src-tauri/src/lib.rs`).
- **Stream proxy** — a loopback-only HTTP server (`src-tauri/src/proxy.rs`) that adds
  the required `Referer` header, sets CORS, and rewrites HLS playlists so segments keep
  the same headers.

## Development

```sh
npm install
npm run tauri dev
```

## Build

```sh
npm run tauri build
```

Requires `sh`, `curl`, and `openssl` on the host; `ani-cli` is bundled and does not need
`fzf`.

See [`src-tauri/resources/PATCHES.md`](src-tauri/resources/PATCHES.md) for the ani-cli
fork contract.
