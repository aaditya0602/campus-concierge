# AI usage log (HokieAssist, PM4)

This log records where **generative AI tools** (e.g. Cursor, ChatGPT-style assistants) materially helped. It does **not** claim that the entire repository was AI-generated.


| Area                                    | What AI helped with                                        | Team follow-up                                                                            |
| --------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `backend/main.py`                       | Drafting FastAPI app structure, CORS, and endpoint stubs   | Wired real scraper and transit functions; removed debug prints; rebranded to HokieAssist  |
| `backend/nlu.py`                        | Suggesting regex patterns for transit intents and phrasing | Team expanded `CAMPUS_PLACES`, BT route codes, and tested queries against campus language |
| `backend/langchain_agent.py`            | Initial keyword-router idea when LangChain was removed     | Simplified error handling; clarified docstrings; fixed typing (`Any` vs `any`)            |
| `backend/scrapers/`*                    | Occasional debugging suggestions only                      | **Team-owned:** selectors, URLs, and parsing logic verified against live sites            |
| `frontend/src/App.tsx` (and related UI) | Layout, Tailwind structure, speech synthesis wiring        | Adjusted copy, branding (HokieAssist), and UX details                                     |


**Prompts:**

- “Add a FastAPI backend with CORS and a `/ask` POST that calls scrapers…”
- “Parse user queries for ‘next bus to X’ and ‘route from A to B’ with regex in Python…”
- “Build a React + Vite chat UI with mic button and Web Speech API…”

