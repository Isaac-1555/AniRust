# Product Requirements Document: ani-cli Web Interface

## Product overview
This product is a browser-based interface that lets users search anime through a familiar search bar while a backend service executes `ani-cli` commands and returns structured search results to the UI. The underlying CLI supports anime search, episode selection, quality controls, dubbed/subbed preferences, history, and non-interactive execution flags, which makes it a reasonable engine for a thin orchestration layer rather than a feature to reimplement from scratch.[cite:2][cite:4]

The product should be treated as a web application on top of a command-line automation layer, not as a direct browser-based video player. The Ubuntu and Debian man pages describe `ani-cli` as a shell script that scrapes Allanime, supports non-interactive mode, quality selection, dubbed playback, episode/range selection, history, and download behavior, all of which shape the feasible surface area for the first release.[cite:2][cite:6]

Because `ani-cli` depends on scraping third-party sources, the product must be designed for source fragility, failure recovery, and legal review. The official documentation and package descriptions explicitly note that the tool scrapes Allanime or related sources, so backend adapters and error states are core requirements rather than edge cases.[cite:2][cite:6][cite:18]

## Problem statement
`ani-cli` is powerful for technical users, but its terminal-first UX creates friction for users who want search, quick result inspection, and guided actions without memorizing flags. Common actions such as selecting an anime, choosing sub or dub, setting quality, continuing from history, or choosing episodes are currently optimized for shell usage and external menu tools such as `fzf` or `rofi` rather than a mainstream browser flow.[cite:2]

A web interface can make discovery and selection dramatically easier, but only if it does not become a brittle wrapper around an interactive terminal process. The CLI already provides a non-interactive mode and nth-result selection, which suggests the best product architecture is command orchestration plus parsing, not terminal emulation in the browser.[cite:2]

## Product vision
Build a clean, fast web app where a user can type an anime title, receive structured search results, inspect metadata, choose sub or dub, select episode and quality, and trigger backend actions powered by `ani-cli` without needing to understand the terminal. The browser should feel like a search and control plane, while a secure backend worker owns process execution, parsing, retries, and observability.[cite:2][cite:4]

The product should aim for two outcomes: lower the usability barrier for `ani-cli`, and create a modular foundation that can later support multiple providers or even replace the CLI layer if upstream behavior changes. This is important because the upstream project is maintained but tied to scraping behavior that can shift when source sites change.[cite:1][cite:17]

## Goals and non-goals
### Goals
- Let a user search anime from a single prominent search bar and view structured results generated via backend `ani-cli` execution.[cite:2][cite:4]
- Support core playback parameters exposed by the CLI: sub/dub, quality, episode or range, continue from history, and non-interactive execution paths.[cite:2]
- Provide robust loading, empty, and failure states for timeouts, scrape failures, unavailable titles, and upstream source changes.[cite:2][cite:6]
- Create an architecture where frontend, backend API, job runner, and parser are independently testable.
- Make the first release legally conservative by avoiding any implication that the app owns or hosts anime content.

### Non-goals for v1
- Rebuilding all `ani-cli` features, including every environment variable and niche playback mode, in the first release.[cite:2]
- Browser-native video streaming from scraped URLs as a guaranteed feature; some flows may remain “launch in configured player” depending on legality, CORS, and source behavior.[cite:2]
- Social watch or Syncplay integration in v1, even though the CLI supports a syncplay flag.[cite:2]
- Cross-platform desktop packaging for the first milestone.

## Target users
### Primary users
- Existing `ani-cli` users who want a faster discovery and control layer than the terminal.
- Anime viewers comfortable with web apps but not with CLI syntax.
- Self-hosters who want a private frontend over an existing local `ani-cli` installation.

### Secondary users
- Developers who want a reusable architecture for wrapping terminal tools in web interfaces.
- Power users who want saved preferences, history, and reusable commands without memorizing flags.[cite:2]

## User stories
- As a user, I want to type an anime title in a search bar and see matching results quickly.
- As a user, I want to click a result and view available episodes, sub/dub options, and quality settings before taking an action.
- As a user, I want the interface to remember my preferred language mode and video quality for the current session.
- As a user, I want to continue from recent history without searching again, since `ani-cli` already supports continue behavior.[cite:2]
- As a user, I want clear error messages when the upstream source is down or search parsing fails, rather than cryptic terminal output.
- As an admin or developer, I want every CLI invocation logged with a sanitized command template, execution time, exit code, and parser result.

## Core use cases
### Use case 1: Search and inspect
1. User lands on the home page.
2. User types “Frieren” into the search bar.
3. Frontend sends a request to `/api/search?q=Frieren`.
4. Backend runs `ani-cli` in a non-interactive, parser-friendly mode or equivalent wrapper flow.
5. Backend returns normalized results: title, source title, result index, available modes if detectable, and action affordances.[cite:2]
6. User clicks one result to open a detail panel.

### Use case 2: Select options and start playback
1. User opens a result.
2. User chooses sub or dub and a target quality.
3. User selects an episode or range.
4. Frontend submits a “play” action.
5. Backend maps UI selections to CLI flags such as `--dub`, `-q`, and `-e` and then executes a worker task.[cite:2]
6. System returns status: launched, failed, unsupported, or blocked by policy.

### Use case 3: Continue watching
1. User clicks “Continue”.
2. Frontend calls `/api/history/continue`.
3. Backend triggers the CLI continue flow and returns the resolved title or launch state, since the CLI supports a continue mode via `-c`.[cite:2]

### Use case 4: Search-only mode for safer deployment
1. User searches and browses results.
2. User inspects titles, episode availability, and metadata.
3. Playback is disabled in deployments where legal or operational policy disallows launching external streams.
4. Product still delivers useful search and organization value.

## Experience principles
- Search-first: one clear search input dominates the landing view.
- Structured over raw: never expose raw terminal output by default; parse and normalize it.
- Optimistic but honest: show progress states, but never fake availability.
- Safe by default: every backend action must be whitelisted, parameterized, rate-limited, and auditable.
- Designed for breakage: upstream scrape failures are expected and should have explicit UI states.

## Functional requirements
### 1. Search
- Provide a search input with debounce and submit-on-enter.
- Support manual submit in addition to debounce for accessibility and control.
- Return a result list with title, alternate title if parseable, and action buttons.
- If the backend cannot parse structured output directly from `ani-cli`, the system must use an adapter that captures stdout/stderr and transforms it into a stable JSON schema.
- Search requests must support cancellation from the frontend to avoid stale result overwrites.

### 2. Result detail
- Clicking a result opens a detail view or side panel.
- Detail view shows available episodes if retrievable, or a follow-up fetch action if episode enumeration requires another CLI call.
- Detail view includes selectors for language mode, quality, and episode/range, mirroring CLI capabilities such as `--dub`, `-q`, and `-e`.[cite:2]
- UI must display when a setting is not supported or not detectable for a given title.

### 3. Background command execution
- Backend must run only approved command templates; no raw shell access from client input.
- Commands must be executed through a worker layer that enforces timeout, concurrency limits, stdout/stderr capture, and exit code handling.
- System must support non-interactive execution paths wherever possible, because the CLI includes `--non-interactive` and index selection capabilities intended to bypass interactive menus.[cite:2]
- Each job must emit machine-readable status updates: queued, running, parsing, success, failed, timed out, blocked.

### 4. History and session preferences
- Support “Continue watching” based on CLI history where available, aligning with the `-c` flag behavior.[cite:2]
- Store web-session preferences such as preferred quality and dub/sub mode in the application session or database.
- Show recent searches and recent actions for signed-in or local-session users.

### 5. Error handling
- Distinguish between user errors, upstream source failures, parser failures, and infrastructure failures.
- Present actionable messages such as “Source temporarily unavailable” or “This deployment disables playback actions.”
- Offer retry for transient failures.
- Preserve failed raw logs in admin observability views, not in the end-user default interface.

### 6. Admin and observability
- Admin page shows recent jobs, exit codes, average latency, timeout rate, and parser success rate.
- Capture upstream breakage signals, such as sudden spikes in zero-result searches or parse failures.
- Provide a feature flag system to disable playback, downloads, or dub mode without redeploying.

## Command orchestration requirements
The web app should not directly expose `ani-cli` as a terminal in the browser. Instead, it should implement a command orchestration service with four layers:

1. **API layer**: validates input, authenticates the user, and creates jobs.
2. **Runner layer**: executes approved `ani-cli` command templates in an isolated environment.
3. **Parser layer**: transforms CLI output into a stable internal JSON schema.
4. **Policy layer**: enforces deployment rules, legal toggles, and capability restrictions.

Suggested command patterns for v1:
- Search: wrapper around `ani-cli` search flow in non-interactive mode where possible.[cite:2]
- Select result by index: wrapper using nth-selection support such as `-S` when compatible with your flow.[cite:2]
- Set quality: wrapper using `-q` values supported by the man page, including best, worst, 360, 480, 720, and 1080.[cite:2]
- Set dubbed mode: wrapper using `--dub`.[cite:2]
- Episode or range: wrapper using `-e` or `--range`.[cite:2]
- Continue from history: wrapper using `-c`.[cite:2]

The parser should normalize all command results into this baseline schema:

```json
{
  "requestId": "uuid",
  "status": "success",
  "query": "frieren",
  "results": [
    {
      "id": "source-index-or-derived-id",
      "index": 1,
      "title": "Frieren: Beyond Journey's End",
      "sourceTitle": "Sousou no Frieren",
      "availableActions": ["details", "play"],
      "metadata": {
        "dubAvailable": null,
        "episodeCount": null
      }
    }
  ],
  "raw": null,
  "error": null
}
```

## Architecture
### Recommended architecture
- **Frontend**: Next.js or React SPA with server actions or API routes for tight integration.
- **Backend API**: Node.js, Bun, or a small Go service that accepts validated requests and dispatches jobs.
- **Worker**: isolated runner container with `ani-cli`, media player integration if needed, timeout controls, and read-only application code.
- **Queue**: Redis-backed queue such as BullMQ if you need multi-user execution and retries.
- **Storage**: Postgres or SQLite for search history, preferences, job logs, and feature flags.
- **Realtime**: SSE or WebSockets for live job status updates.

### Why this architecture fits
A simple synchronous API may work for prototype search, but playback and multi-step selection flows become more reliable with queued jobs and status updates. Since `ani-cli` can trigger external players, downloads, and source-specific behavior, a worker boundary helps contain failures and keeps the web tier responsive.[cite:2]

## API design
### Public endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/search` | GET | Search anime by query |
| `/api/anime/:id` | GET | Fetch detail or episode options if derivable |
| `/api/actions/play` | POST | Launch playback job |
| `/api/actions/continue` | POST | Continue from history |
| `/api/jobs/:id` | GET | Poll job state |
| `/api/preferences` | GET/POST | Read or update session or account preferences |

### Example request: search
```http
GET /api/search?q=frieren
```

### Example response: search
```json
{
  "status": "success",
  "query": "frieren",
  "results": [
    {
      "id": "frieren-1",
      "index": 1,
      "title": "Frieren: Beyond Journey's End",
      "subtitle": "Sousou no Frieren"
    }
  ]
}
```

### Example request: play
```json
{
  "animeId": "frieren-1",
  "selectionIndex": 1,
  "episode": "1",
  "mode": "sub",
  "quality": "720"
}
```

## UX and interface requirements
### Primary screens
1. Home/search page
2. Search results page or inline results view
3. Anime detail drawer or page
4. Job status modal/toast system
5. History page
6. Admin/observability page

### Search page
- Large centered search bar on desktop, top-pinned on mobile.
- Placeholder example such as “Search anime title”.
- Quick chips for “Continue”, “Recent”, “Sub”, “Dub”, “720p”.
- Empty state explaining what the app does.

### Results page
- List layout by default; grid is optional but secondary.
- Each card shows title, source label, and actions such as “Open”, “Play”, or “Queue”.
- Each result supports keyboard navigation.
- Loading skeletons must preserve layout.

### Detail panel
- Metadata header with title and badges.
- Episode selector with range support.
- Quality selector using valid options documented in the man page.[cite:2]
- Language toggle for sub/dub.[cite:2]
- Primary CTA changes by deployment mode: “Start playback”, “Queue action”, or “Open in player”.

### Status states
- Queued
- Running command
- Parsing results
- Success
- Failed
- Upstream unavailable
- Action disabled by policy

## Design direction
The interface should feel like a search product, not a streaming clone. Use a restrained dark-first visual system with terminal-inspired details only as subtle accents, such as monospace status pills or execution logs in admin views, while the main product remains clean and consumer-friendly.

Recommended design characteristics:
- Dark neutral surfaces with one muted accent color.
- Strong search prominence.
- Left-aligned content and compact cards rather than oversized marketing blocks.
- One primary action per screen.
- Distinct states for loading, empty, and failure.

Avoid:
- Fake anime thumbnails if reliable image metadata is unavailable.
- Decorative terminal gimmicks in the core flow.
- A direct embedded shell window as the main interaction model.

## Technical constraints
### CLI constraints
The man page indicates that `ani-cli` is fundamentally a shell script that scrapes Allanime and can behave interactively or non-interactively depending on flags and environment variables.[cite:2] That means output stability is not guaranteed as a formal API contract, so parsing logic must be version-aware and covered by tests.[cite:2][cite:17]

### Source fragility
If the scraped source changes markup or behavior, search, episode enumeration, or playback resolution can fail suddenly. The official docs, distro man pages, and package metadata all confirm the scraper dependency, making source breakage a primary risk rather than a rare exception.[cite:2][cite:6][cite:18]

### Legal and policy constraints
This product may expose access paths to third-party streams discovered via a scraper, which raises legal and terms-of-service questions that vary by jurisdiction and deployment model. The PRD should therefore assume legal review is required before any hosted public deployment, and that self-hosted, search-only, or metadata-only modes may be safer launch paths.[cite:2][cite:6]

## Security requirements
- No unsanitized user input may reach shell execution.
- All commands must be assembled from allowlisted templates and validated arguments.
- Worker environment should run with minimal privileges and filesystem access.
- Enforce rate limits by IP, user, and job type.
- Store only sanitized logs in standard observability paths.
- Require authentication for any action beyond public search if deploying to the public internet.
- Disable downloads in v1 unless you explicitly validate their legal and operational implications, despite CLI support for download mode via `-d`.[cite:2]

## Data model
### Entities
#### User
- id
- email or anonymous session id
- role
- createdAt

#### Preference
- userId
- preferredMode (`sub` or `dub`)
- preferredQuality (`best`, `720`, etc.)
- autoplayBehavior
- theme

#### SearchHistory
- id
- userId
- query
- createdAt
- resultCount
- status

#### Job
- id
- userId
- type (`search`, `play`, `continue`, `details`)
- inputPayload
- sanitizedCommand
- status
- startedAt
- finishedAt
- exitCode
- parserStatus
- errorCode

#### AnimeResult
- id
- jobId
- sourceIndex
- title
- sourceTitle
- metadataJson

## Success metrics
### Product metrics
- Search success rate: percentage of searches returning parseable results.
- Median time to first result.
- Result click-through rate.
- Play-action completion rate.
- Continue-action success rate.
- Repeat weekly users.

### Reliability metrics
- Parser failure rate.
- Command timeout rate.
- Upstream source failure rate.
- Error rate by command template.
- Percentage of jobs requiring retry.

### UX metrics
- Time from landing to first successful result click.
- Search abandonment rate.
- Error recovery rate after retry.

## Release plan
### Phase 0: Technical discovery
- Validate which `ani-cli` commands and flags can be reliably scripted for search and selection in your environment.[cite:2]
- Capture raw output samples across at least 20 anime titles and several edge cases.
- Decide whether to wrap the CLI directly or patch/fork it for machine-readable output.
- Complete legal and policy review.

### Phase 1: Prototype
- Search page
- Search API
- Basic parser
- Results list
- Job logs for developers
- Manual testing with a local runner

### Phase 2: MVP
- Detail panel
- Preferences for quality and dub/sub
- Continue flow
- Robust loading, empty, and error states
- Auth for non-public actions
- Admin dashboard

### Phase 3: Post-MVP
- Better metadata enrichment from legal sources where possible
- Saved lists and favorites
- Multi-provider backend abstraction
- Desktop wrapper or local companion app

## Risks and mitigations
| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Upstream scrape source changes | High | High | Add adapter tests, feature flags, fallback modes, and rapid parser patch path.[cite:2][cite:6] |
| CLI output format is unstable | High | Medium | Version-pin `ani-cli`, parse defensively, snapshot-test outputs, consider maintaining a small fork.[cite:2][cite:17] |
| Public hosting creates legal exposure | High | Medium | Start with self-hosted or search-only mode, require legal review, separate metadata browsing from playback actions.[cite:2][cite:6] |
| Command execution introduces security risk | High | Medium | Use allowlisted templates, isolated workers, strict validation, rate limits, and auth. |
| Playback differs by OS/player | Medium | Medium | Treat playback as capability-based; expose deployment capabilities in settings because defaults differ across platforms according to the man page.[cite:2] |
| Interactive CLI dependencies break web flow | Medium | High | Prefer non-interactive mode and selection flags such as `-N` and `-S` where supported.[cite:2] |

## Open questions
- Should the first version be self-hosted only?
- Is playback in-browser a requirement, or is “launch on host machine” acceptable for v1?
- Will the product support anonymous users, signed-in users, or only private deployments?
- Should metadata be enriched from legal APIs such as AniList or MyAnimeList for better result presentation, while keeping `ani-cli` only for action execution?
- Is a fork of `ani-cli` acceptable if needed to produce parseable output more reliably?
- Will mobile web be first-class, or is desktop the primary environment because playback may depend on local player integration?[cite:2]

## Recommended stack
For an indie-builder implementation, a pragmatic stack is:
- Frontend: Next.js + TypeScript + Tailwind
- API: Next.js route handlers or a small Hono/Bun service
- Queue: BullMQ + Redis
- DB: Postgres via Prisma, or SQLite for local-first/self-hosted mode
- Worker: Dockerized Node/Bash runner with `ani-cli` installed
- Realtime: Server-Sent Events for job status

This stack fits the product because the frontend needs responsive state handling, the backend needs strong input validation and process orchestration, and the worker needs isolated execution for a shell-based dependency.

## Acceptance criteria for MVP
- User can search an anime title from the homepage and receive structured results in under 5 seconds median on a healthy deployment.
- User can open a result and choose at least mode, quality, and episode when available.[cite:2]
- Backend never executes arbitrary shell input.
- Every job has observable status and error codes.
- Empty, loading, timeout, upstream failure, and parser failure states are fully designed.
- Continue flow works for supported deployments using CLI history.[cite:2]
- Feature flags can disable playback without breaking search.

## Build checklist
### Product
- Finalize v1 scope and deployment model.
- Decide whether playback is included, gated, or disabled.
- Define legal policy and user-facing disclaimers.

### Engineering
- Capture CLI output fixtures.
- Build parser with tests.
- Implement runner isolation.
- Add rate limiting and auth.
- Add observability and admin tools.

### Design
- Create search-first IA.
- Design robust status states.
- Build keyboard-friendly results and detail views.
- Validate mobile layout for search and results.

### QA
- Test at least 20 title queries, including no-result, special-character, and ambiguous-title searches.
- Test timeouts, upstream failures, invalid episode selections, and disabled playback mode.
- Test with different `ani-cli` versions if your deployment does not pin a single version.[cite:17]

## Final recommendation
The strongest v1 is a self-hosted or limited-access web app focused on search, result inspection, preferences, and controlled backend actions, with playback treated as a deployment capability rather than a universal promise. That recommendation follows directly from the fact that `ani-cli` is a scraper-based shell script with useful automation flags but without a stable public API contract, so product success depends more on safe orchestration and resilience than on flashy frontend scope.[cite:2][cite:6]
