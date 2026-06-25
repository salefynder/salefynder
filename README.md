# SaleFynder

A map-based search tool for finding organized home sale events — garage sales, yard sales, and estate sales — in your area. Hosts can post sales for free (with an item list), and shoppers can search by location, browse listings on a map, and build a multi-stop route to hit several sales in one trip.

SaleFynder is not a single-item marketplace. Each listing is a physical sale event with a location, dates, and a list of what's being sold.

## Features

- Map view powered by Mapbox showing all nearby sales as pins
- Keyword search filtered by radius (1–50 miles)
- Sale detail popups with address, dates, and item tags
- Route planning: select multiple sales, sort by optimized/near-to-far/far-to-near, drag to reorder, then open the full route in Google Maps
- Standard posting form: title, address, dates, and a per-item entry list
- Bulk posting form: upload a CSV file for hosts with large inventories (includes fuzzy category matching for typos)
- Mobile-responsive with a Map/List tab layout and floating action button

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite 8 |
| Map | Mapbox GL JS v3 + react-map-gl v8 |
| Database | Supabase (Postgres) |
| Drag-and-drop | dnd-kit |
| Deployment | Vercel (auto-deploy from `main`) |
| Geocoding | Nominatim (OpenStreetMap) via fetch |

## Local Setup

```bash
git clone https://github.com/salefynder/salefynder.git
cd salefynder
npm install
```

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_public_token
```

Then start the dev server:

```bash
npm run dev
```

## Environment Variables

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_KEY` | Supabase dashboard → Project Settings → API → `anon` / `public` key |
| `VITE_MAPBOX_TOKEN` | Mapbox account → Tokens → your default public token |

Use the Supabase **anon/publishable** key, not the service role key. The Mapbox token is a standard public access token.

## Project Structure

```
src/
  App.jsx           — Root component: map, search, sales list, route planning, modal state
  App.css           — All styles for App.jsx (layout, map, sale cards, route panel, mobile)
  PostSale.jsx      — Standard sale posting form (single-entry items)
  BulkPostSale.jsx  — CSV bulk upload flow for large item lists
  PostSale.css      — Shared styles for both posting forms
  RoutePanel.jsx    — Draggable route stop list with leg durations and Google Maps handoff
  supabaseClient.js — Supabase client initialization
  index.css         — Minimal global reset
  main.jsx          — React entry point
```

## Database Schema

**`sales`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `title` | text | |
| `address` | text | |
| `city` | text | |
| `state` | text | 2-letter abbreviation |
| `zip` | text | |
| `description` | text | |
| `date_start` | date | ISO 8601 (YYYY-MM-DD) |
| `date_end` | date | ISO 8601 (YYYY-MM-DD) |
| `lat` | float8 | Geocoded on submission via Nominatim |
| `lng` | float8 | Geocoded on submission via Nominatim |

**`items`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `sale_id` | uuid | Foreign key → `sales.id` |
| `name` | text | |
| `category` | text | One of: furniture, clothing, electronics, kitchen, tools, toys, books, antiques, jewelry, sports, other |

Each sale has zero or more items. Items are used for keyword search and displayed as tags on sale cards.

## Deployment

The app is deployed on Vercel and auto-deploys on every push to `main`. No manual build step is needed. Environment variables are set in the Vercel project dashboard under Settings → Environment Variables — the same three variables as `.env.local`.

## Architectural Notes

**Why Mapbox instead of a free tile provider**
Mapbox GL JS renders via WebGL which enables smooth zoom, custom markers, and the GeoJSON route line overlay used for route planning. The Mapbox free tier (50,000 map loads/month) is sufficient for early traffic. OpenStreetMap tiles were used for geocoding (Nominatim) since that doesn't require WebGL rendering.

**Multi-stop routes always use Google Maps**
The route planning feature hands off to Google Maps for navigation. Apple Maps was considered but its URL scheme (`maps://`) does not support multiple waypoints — it only accepts a single destination. Google Maps supports full multi-stop routes via the `waypoints=` parameter. This applies on iOS too: even on iPhone, tapping "Open in Google Maps" opens the Google Maps app (or web fallback) rather than Apple Maps.

**iOS date input rendering**
`<input type="date">` on iOS Safari with default `-webkit-appearance` is rendered by the native OS UI layer, which ignores CSS `width` constraints and resolves dimensions against the viewport rather than the CSS containing block. The fix is `-webkit-appearance: none; appearance: none` in the mobile media query, which moves rendering to the CSS layout engine. A measured `min-height: 42px` is added separately to maintain consistent height in the empty state, since removing native appearance also removes the native height contribution. The native date picker wheel still opens on tap.

**Spam protection**
Both posting forms include a honeypot field (`website`, positioned off-screen) and client-side rate limiting via `localStorage` (`sf_post_timestamps`). The rate limit is 3 successful posts per 10 minutes, shared across both forms. These are lightweight first-line defenses; server-side validation would be the next step if abuse becomes a problem.

**CSV bulk upload category matching**
`BulkPostSale.jsx` includes an inline Levenshtein distance implementation (no library dependency) for fuzzy-matching category names from uploaded CSV files. Typos within edit distance 2 are auto-corrected; anything further is flagged yellow in the preview table with an editable dropdown.
