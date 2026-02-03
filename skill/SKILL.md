---
name: klaud-api
description: >
  Query real-time data via Klaud API — Hacker News, PubMed, arXiv, crypto prices,
  GitHub trending, drug/molecule lookup (ChEMBL), and web page extraction.
  Use when the agent needs structured JSON data from these sources without API keys
  or complex scraping. Free tier: 20 req/day. Pro tier (API key): 1000 req/day.
metadata: {"openclaw":{"primaryEnv":"KLAUD_API_KEY","homepage":"https://klaud-api.klaud0x.workers.dev"}}
---

# Klaud API

Base URL: `https://klaud-api.klaud0x.workers.dev`

All endpoints return JSON. No auth required for free tier (20 req/day per IP).
Pro tier: pass `?key=<KLAUD_API_KEY>` or header `X-API-Key` (1000 req/day, $9/mo).

## Endpoints

| Endpoint | Purpose | Key params |
|---|---|---|
| `/api/hn` | Hacker News top stories | `?category=ai\|crypto\|dev\|science\|security\|all` `&limit=N` |
| `/api/pubmed` | PubMed article search | `?q=query` `&limit=N` |
| `/api/arxiv` | arXiv paper search | `?q=query` `&category=cs.AI` `&limit=N` |
| `/api/crypto` | Cryptocurrency prices | `?ids=bitcoin,ethereum` (CoinGecko IDs) |
| `/api/github` | GitHub trending repos | `?language=python` `&since=daily\|weekly\|monthly` |
| `/api/extract` | Extract text from URL | `?url=https://...` |
| `/api/drugs` | Drug/molecule lookup (ChEMBL) | `?q=imatinib` or `?target=EGFR` |

## Usage

Fetch via `web_fetch` or `exec` (curl/node fetch). Example:

```
web_fetch https://klaud-api.klaud0x.workers.dev/api/hn?category=ai&limit=5
```

```
web_fetch https://klaud-api.klaud0x.workers.dev/api/drugs?target=EGFR
```

Pro tier with key:
```
web_fetch https://klaud-api.klaud0x.workers.dev/api/pubmed?q=CRISPR&key=ka_xxxxx
```

## Rate limits

Check remaining quota:
```
web_fetch https://klaud-api.klaud0x.workers.dev/api/status
```

For detailed endpoint docs and response schemas, see [references/api-docs.md](references/api-docs.md).

## Pro tier

$9/month, 1000 requests/day. Payment: USDT (TRC20).
Details: https://klaud-api.klaud0x.workers.dev (landing page).

Configure in `openclaw.json`:
```json
{ "skills": { "entries": { "klaud-api": { "apiKey": "ka_YOUR_KEY" } } } }
```

The key is auto-injected as `KLAUD_API_KEY` env var. Append `?key=${KLAUD_API_KEY}` to requests.
