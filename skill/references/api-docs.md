# Klaud API — Endpoint Reference

Base: `https://klaud-api.klaud0x.workers.dev`

## GET /api/hn

Hacker News top stories filtered by category.

**Params:**
- `category` — `ai|crypto|dev|science|security|all` (default: `all`)
- `limit` — 1–30 (default: 10)

**Response:**
```json
{
  "source": "hackernews",
  "category": "ai",
  "count": 5,
  "stories": [
    {
      "title": "...",
      "url": "...",
      "score": 342,
      "by": "user",
      "time": 1706900000,
      "descendants": 128,
      "hn_url": "https://news.ycombinator.com/item?id=..."
    }
  ]
}
```

---

## GET /api/pubmed

Search PubMed for biomedical articles.

**Params:**
- `q` — search query (required)
- `limit` — 1–20 (default: 5)

**Response:**
```json
{
  "source": "pubmed",
  "query": "CRISPR cancer",
  "count": 5,
  "articles": [
    {
      "pmid": "39876543",
      "title": "...",
      "authors": ["Author A", "Author B"],
      "journal": "Nature",
      "pubDate": "2026-01-15",
      "abstract": "...",
      "url": "https://pubmed.ncbi.nlm.nih.gov/39876543/"
    }
  ]
}
```

---

## GET /api/arxiv

Search arXiv preprints with optional category filter.

**Params:**
- `q` — search query (required)
- `category` — arXiv category, e.g. `cs.AI`, `q-bio.BM` (optional)
- `limit` — 1–20 (default: 5)

**Response:**
```json
{
  "source": "arxiv",
  "query": "LLM agents",
  "count": 5,
  "papers": [
    {
      "id": "2601.12345",
      "title": "...",
      "authors": ["Author A"],
      "summary": "...",
      "published": "2026-01-20T00:00:00Z",
      "category": "cs.AI",
      "url": "https://arxiv.org/abs/2601.12345",
      "pdf": "https://arxiv.org/pdf/2601.12345"
    }
  ]
}
```

---

## GET /api/crypto

Cryptocurrency prices via CoinGecko (with CoinCap fallback).

**Params:**
- `ids` — comma-separated CoinGecko IDs (default: `bitcoin,ethereum`)

**Response:**
```json
{
  "source": "coingecko",
  "prices": {
    "bitcoin": { "usd": 98542.00, "usd_24h_change": 2.34 },
    "ethereum": { "usd": 3241.50, "usd_24h_change": -1.12 }
  },
  "timestamp": "2026-02-03T12:00:00Z"
}
```

---

## GET /api/github

GitHub trending repositories.

**Params:**
- `language` — filter by language, e.g. `python`, `rust` (optional)
- `since` — `daily|weekly|monthly` (default: `daily`)

**Response:**
```json
{
  "source": "github-trending",
  "language": "python",
  "since": "daily",
  "count": 10,
  "repos": [
    {
      "name": "owner/repo",
      "description": "...",
      "language": "Python",
      "stars": 1234,
      "starsToday": 89,
      "forks": 56,
      "url": "https://github.com/owner/repo"
    }
  ]
}
```

---

## GET /api/extract

Extract readable text from any URL (HTML → text).

**Params:**
- `url` — target URL (required)

**Response:**
```json
{
  "source": "extract",
  "url": "https://example.com/article",
  "title": "Article Title",
  "text": "Extracted plain text content...",
  "length": 4521
}
```

---

## GET /api/drugs

Drug and molecule lookup via ChEMBL (2.4M compounds).

**Mode 1 — Search by name:**
- `q` — drug/molecule name, e.g. `imatinib`

**Mode 2 — Search by target:**
- `target` — protein target name, e.g. `EGFR`

**Response (search by name):**
```json
{
  "source": "chembl",
  "query": "imatinib",
  "count": 1,
  "molecules": [
    {
      "chembl_id": "CHEMBL941",
      "name": "IMATINIB",
      "max_phase": 4,
      "molecule_type": "Small molecule",
      "formula": "C29H31N7O",
      "weight": 493.61,
      "alogp": 3.50,
      "hba": 7,
      "hbd": 2,
      "psa": 86.28,
      "ro5_violations": 0,
      "oral": true,
      "indication_class": "Antineoplastic",
      "first_approval": 2001
    }
  ]
}
```

**Response (search by target):**
```json
{
  "source": "chembl",
  "target": "EGFR",
  "count": 12,
  "drugs": [
    {
      "chembl_id": "CHEMBL939",
      "name": "ERLOTINIB",
      "max_phase": 4,
      "first_approval": 2004
    }
  ]
}
```

---

## GET /api/status

Check rate limit usage for current IP/key.

**Response:**
```json
{
  "plan": "free",
  "daily_limit": 20,
  "used_today": 7,
  "remaining": 13,
  "resets_at": "2026-02-04T00:00:00Z"
}
```

---

## Authentication (Pro tier)

Pass API key via query param or header:
- `?key=ka_xxxxx`
- `X-API-Key: ka_xxxxx`

## Error responses

```json
{ "error": "Rate limit exceeded", "status": 429 }
{ "error": "Invalid API key", "status": 401 }
{ "error": "Missing required parameter: q", "status": 400 }
```
