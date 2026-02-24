# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies (requires pnpm@9.5.0)
pnpm start            # Development mode with file watching; load extension from src/build/{browser}
pnpm run build-dev    # One-time development build (no watch)
pnpm run build        # Production build
pnpm run zip          # Package production build into zip files for deployment
pnpm check            # TypeScript type check + Biome lint check
pnpm fix              # Auto-fix Biome lint/format issues
pnpm tsc              # TypeScript type check only
```

### Setup
Copy `.env.example` to `.env` and fill in credentials (Trakt API, TMDb, Rollbar, extension IDs, and service-specific keys like `KINOPUB_CLIENT_ID`).

### Adding a new streaming service
```bash
npx trakt-tools dev create-service  # Interactive wizard to scaffold all required files
npx trakt-tools dev update-service  # Add missing scrobbler/sync files to an existing service
```

## Architecture

This is a **browser extension** (Chrome/Firefox) that scrobbles TV shows and movies to Trakt.tv. The build system uses Webpack, which generates separate bundles for each extension page and each streaming service's content script.

### Extension entry points (webpack entries)

| Bundle | Source | Purpose |
|--------|--------|---------|
| `background` | `src/modules/background/background.ts` | Service worker; handles messaging, requests, auth, notifications |
| `popup` | `src/modules/popup/popup.tsx` | Browser action popup (React) |
| `history` | `src/modules/history/history.tsx` | History sync page (React) |
| `options` | `src/modules/options/options.tsx` | Settings page (React) |
| `trakt` | `src/modules/content/trakt/trakt.ts` | Content script injected into Trakt.tv |
| `{service-id}` | `src/services/{service-id}/{service-id}.ts` | Per-service content script |

### How services are registered

Webpack's `string-replace-loader` automatically populates `src/services/services.ts` and `src/services/apis.ts` with imports at build time (replacing `// @import-services` and `// @import-services-apis` markers). Service metadata is read directly from `{ServiceName}Service.ts` at build time to generate manifest entries and content script registrations.

### Service file structure

Each service in `src/services/{service-id}/` needs:

- **`{ServiceName}Service.ts`** — Defines a `Service` instance with `id`, `name`, `homePage`, `hostPatterns`, `hasScrobbler`, `hasSync`, `hasAutoSync`.
- **`{ServiceName}Api.ts`** — Extends `ServiceApi` (`src/apis/ServiceApi.ts`). Handles login detection and, for sync-enabled services, implements `loadHistoryItems()`, `isNewHistoryItem()`, `getHistoryItemId()`, `convertHistoryItems()`, `updateItemFromHistory()`. For scrobbler-enabled services, implements `getItem(id)`. May add entries to `Shared.functionsToInject` for page-context script injection.
- **`{ServiceName}Parser.ts`** — Extends `ScrobbleParser` (`src/common/ScrobbleParser.ts`). Detects playback state and current item. Parser resolution order: video player element → injected script → DOM override → custom override.
- **`{service-id}.ts`** — Content script entry point; imports the parser and calls `init(serviceId)`.

### Item model

`src/models/Item.ts` defines `EpisodeItem` and `MovieItem` (both extending `ScrobbleItem`). A `ScrobbleItem` has: `serviceId`, `id`, `title`, `year`, `watchedAt`, `progress`, and a `trakt` field (populated by `TraktSearch`/`TraktSync`).

### Key shared modules (`src/common/`)

- **`Requests.ts`** — All HTTP requests go through the background script via messaging (content scripts cannot make cross-origin requests directly).
- **`ScriptInjector.ts`** — Injects functions into page context to access page-private globals (e.g., Netflix's `window.netflix`). Functions are registered in `Shared.functionsToInject` with keys like `{serviceId}-session`, `{serviceId}-item`, `{serviceId}-playback`.
- **`BrowserStorage.ts`** — Wrapper around `browser.storage`.
- **`Cache.ts`** — In-memory cache synced via background script.
- **`Messaging.ts`** — Message passing between background, content scripts, and UI pages.
- **`Shared.ts`** — Global shared state; `pageType` is `'background'`, `'content'`, or UI page name.

### Trakt APIs (`src/apis/`)

- **`TraktSearch.ts`** — Searches Trakt for a matching item.
- **`TraktSync.ts`** — Loads watch history from Trakt.
- **`TraktScrobble.ts`** — Sends scrobble events to Trakt.
- **`TraktAuth.ts`** — OAuth flow.

### Path aliases (from `tsconfig.json`)

Major aliases: `@common/*`, `@apis/*`, `@models/*`, `@services`, `@services-apis`, `@background`, `@service` (content script init), `@/*` (services or src).

## Code style

- **Formatter**: Biome with tabs (width 2), single quotes, semicolons always, line width 100.
- **Linter**: `noUnusedVariables` is an error for TypeScript files.
- Pre-commit hook runs Biome check+fix via lint-staged on staged `*.{js,jsx,ts,tsx,json,css}` files.
- No test suite is present in this repository.
