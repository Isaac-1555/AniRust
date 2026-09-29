# ani-cli fork notes

AniRust bundles a lightly patched copy of [`ani-cli`](https://github.com/pystardust/ani-cli)
at `resources/ani-cli` (upstream version in `version_number`, currently 5.1.4, which uses
the hianime provider).

Upstream `ani-cli` is interactive and expects a menu program (`fzf`/`dmenu`/`rofi`) plus a
local media player. To drive it from a GUI, the following non-interactive actions were
added. They run before dependency/menu checks and never launch a player (the caller sets
`ANI_CLI_PLAYER=debug`).

## Added flags

| Flag | Argument | Purpose |
|---|---|---|
| `--search-only` | query | Print search results to stdout and exit |
| `--url-only` | — | Resolve a single stream URL and exit (with `--anime-id`) |
| `--episodes-only` | — | Print the episode list and exit (with `--anime-id`) |
| `--anime-id` | id | Set the hianime slug/id directly |
| `--anime-title` | title | Set the display title directly |

## Output contract

Search (`--search-only`): one result per line, tab separated (`id<TAB>name`):

```
frieren-beyond-journeys-end-481	Frieren: Beyond Journey's End
```

Episodes (`--episodes-only`): one episode number per line.

URL (`--url-only`): first line is the resolved stream URL, followed by optional
metadata lines that AniRust consumes:

```
<stream-url>
ANI_SUBS=<subtitle url>
ANI_REFR=<referrer url>
```

`ANI_SUBS` / `ANI_REFR` are only printed when present. `ANI_REFR` is the referrer the
stream host requires (AniRust's loopback proxy injects it, since a browser `<video>`
cannot set that header). `sub_link` and `refr` come from `hianime_m3u8`.

## Updating

`ani-cli -U` (or re-downloading upstream) will overwrite these changes. After updating,
re-apply the `--search-only`, `--url-only`, `--episodes-only`, `--anime-id`,
`--anime-title` handling in the argument loop and the `api_action` dispatch block that
sits just before `info "Checking dependencies..."`.

The hianime provider may require `curl-impersonate` if the site starts returning
Cloudflare challenges; the script falls back through `curl_firefox135`, `curl_chrome136`,
`curl_chrome116`, `curl_ff117`, then plain `curl`.

## Stream hosts

hianime.at has switched its default embed server. Older scrapes used `ZokoAnime`
(config obfuscated as base64(json XOR "otaku-embed-v1"), handled by `deobfuscate_blob`).
It now returns `Vidstream-2`, which is a `megaplay.buzz` embed, so `hianime_m3u8` picks a
`megaplay` server when present and falls back to the ZokoAnime flow otherwise.

megaplay resolution (`megaplay_m3u8`):

1. read the file id from `#megaplay-player[data-id]` on the embed page (the page needs a
   `Referer`, so the embed origin is sent);
2. `GET {origin}/stream/getSources?id=<id>&type=<sub|dub>`;
3. the real playlist URL sits in the `enc` field, base64url of an AES-256-CBC blob.
   `megaplay_decrypt` decodes it with the player's fixed key/iv (requires `openssl`);
4. subtitles come from the response `tracks`; `ANI_REFR` is the megaplay origin so the
   loopback proxy signs every playlist/segment request with the right referer.
