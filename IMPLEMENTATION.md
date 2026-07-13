# PM4 — Implementation (HokieAssist)

## Product overview

**HokieAssist** is a Virginia Tech–focused assistant that answers questions about **dining**, **Blacksburg Transit**, and **club events**, with **natural-language routing** for common transit phrasing.

## What we implemented (core functionality)


| Feature                     | Location                              | Behavior                                                                                                                                             |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main Q&A API                | `backend/main.py` — `POST /ask`       | Parses query with `parse_transit_query`; for transit intents calls enhanced bus/Maps helpers; otherwise uses keyword routing in `langchain_agent.py` |
| Dedicated transit API       | `backend/main.py` — `POST /bus/query` | Same NLU with optional explicit `origin`                                                                                                             |
| Dining snapshot             | `GET /dining`                         | `scrapers/dining.py` → UDC-related data                                                                                                              |
| Bus snapshot                | `GET /bus`                            | `scrapers/bus.py`                                                                                                                                    |
| Club events                 | `GET /clubs`                          | `scrapers/clubs.py`                                                                                                                                  |
| NLU + place aliases         | `backend/nlu.py`                      | Regex/heuristic intents; `CAMPUS_PLACES` normalization; optional OpenAI path when configured                                                         |
| General non-transit answers | `backend/langchain_agent.py`          | Keyword-based calls into scrapers (module name is legacy; **no LangChain** in this path)                                                             |
| Web UI                      | `frontend/`                           | React + TypeScript + Vite; voice input/output via Web Speech API; calls backend `/ask`                                                               |


## Architecture (short)

```text
Browser (React)  --HTTP-->  FastAPI (main.py)
                              |
              +---------------+---------------+
              |               |               |
           nlu.py      scrapers/*     langchain_agent.py
         (intents)    (live data)    (keyword fallback)
```

## Does it do what we expected?

**Mostly yes** for the PM4 scope: the API and UI demonstrate end-to-end flow from user question to live or semi-live data. **Limitations:** external websites and APIs can change without notice; scraping may fail or return partial data; accurate transit directions depend on **Google Maps** (and related) keys when those code paths are used. We treat this as an evolving prototype rather than a production guarantee.

## AI tools — how and why

We used **generative AI assistants (including Cursor)** to **speed up scaffolding and refactoring**, not to replace domain work.

- **Why:** faster boilerplate (FastAPI routes, React layout), explore regex approaches for NLU, and debug integration issues.
- **What we changed after AI output:** VT-specific place names and bus routes, error handling, branding rename to **HokieAssist**, removal of noisy debug logging, and alignment of documentation with the actual stack (no LangChain in the keyword-router path).

A concise per-file log lives in `[docs/AI_USAGE_LOG.md](docs/AI_USAGE_LOG.md)`. **We did not label the whole codebase as AI-generated**; scrapers and the `CAMPUS_PLACES` dataset are treated as **team-maintained**.

## Honesty note (no-AI path)

If a teammate did **not** use AI on a given file, they should not be attributed to AI in the log. Update `docs/AI_USAGE_LOG.md` and this section to match your team’s **actual** tool usage before final submission.

## How to run

See root `[README.md](README.md)`.