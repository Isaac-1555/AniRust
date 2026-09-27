# ani-cli fork notes

Anickie bundles a lightly patched copy of [`ani-cli`](https://github.com/pystardust/ani-cli)
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
metadata lines that Anickie consumes:

```
<stream-url>
ANI_SUBS=<subtitle url>
ANI_REFR=<referrer url>
```

`ANI_SUBS` / `ANI_REFR` are only printed when present. `ANI_REFR` is the referrer the
stream host requires (Anickie's loopback proxy injects it, since a browser `<video>`
cannot set that header). `sub_link` and `refr` come from `hianime_m3u8`.

## Updating

`ani-cli -U` (or re-downloading upstream) will overwrite these changes. After updating,
re-apply the `--search-only`, `--url-only`, `--episodes-only`, `--anime-id`,
`--anime-title` handling in the argument loop and the `api_action` dispatch block that
sits just before `info "Checking dependencies..."`.

The hianime provider may require `curl-impersonate` if the site starts returning
Cloudflare challenges; the script falls back through `curl_firefox135`, `curl_chrome136`,
`curl_chrome116`, `curl_ff117`, then plain `curl`.
