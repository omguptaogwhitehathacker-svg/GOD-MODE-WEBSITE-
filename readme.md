Website God Mode
Welcome to Website God Mode — a personal project built to bring together a range of public APIs into a single-page dashboard. There’s no backend, no database, no login flow, no authentication, and no payment step. Just open the page and start searching.

What is this?
If you want to look up a car, a development board, a GitHub repository, a stock, or a Wikipedia article without opening multiple tabs, this is the tool for that. Website God Mode acts as a unified search space for the kinds of things I find useful: hardware, vehicles, open-source code, and market data. It also includes a Project Forge for generating project ideas by combining different concepts, along with an AI Analysis section that offers quick insights for stocks, repositories, and articles — all handled client-side without relying on an external AI service.

Features
God Search — search across Wikipedia, GitHub, dev boards, and vehicles in one place. Results are displayed as cards with images when available.

Dev Boards — browse and search development boards such as Raspberry Pi, Arduino, and ESP models using Wikidata. Partial matches work well, such as "rasp".

Vehicles — search for cars and motorcycles in Wikidata with fuzzy matching included.

GitHub Repos — look up public repositories, view details, inspect star history, and preview README files.

Hack Club — list repositories from the Hack Club organization and check whether Scrapbook data is available.

Stocks — enter a stock symbol such as AAPL, TSLA, or RELIANCE.NS to view real-time pricing and chart data. The app falls back through multiple sources if one fails.

AI Analysis — local, rule-based analysis for stocks (bullish or bearish sentiment, RSI, volatility), GitHub repositories (activity score), Wikipedia articles (summary and keywords), dev boards, and vehicles.

Project Forge — generate random project ideas by combining hardware, software, and topic ideas.

Support — a mailto link is included for reporting issues or sending feedback.

Privacy & Security
This project was built around a simple principle: your data stays yours. That means:

No logins — there is no account to create, remember, or leak.

No authentication — no OAuth, no passwords, and no tokens.

No credit cards — the app is free and does not hide subscription walls.

No data storage — everything is fetched on demand and disappears when the tab is closed. There are no analytics scripts, no tracking, and no cookies beyond what the browser may cache for images.

It is a clean, client-side tool designed with privacy in mind.

Tech Stack
Pure HTML5, CSS3, and JavaScript (ES6+) — no frameworks and no build tools.

Chart.js is used for graphs and is loaded from a CDN.

APIs used:

Wikipedia REST & Query API (search and summaries)

Wikidata SPARQL (dev boards and vehicles)

GitHub REST API (repositories and organization data)

Hack Club Scrapbook API

Stooq / Yahoo Finance for stock data (via the CORS proxy api.allorigins.win)

How to Run
Download or clone this repository.

Open index.html in your browser.

Note: some browsers block fetch requests when opening files directly via file://. If you run into errors, use a simple local server instead:

bash
# Python 3
python -m http.server 8000
Then open http://localhost:8000 in your browser.

How It Works
The app is built as a single-page application with hash-based routing. When a nav item is clicked, the hash changes (for example, #/vehicles), and the router updates the main content area. All data fetching happens client-side using fetch, with a lightweight in-memory cache (5-minute TTL) to help avoid unnecessary API calls.

No data is ever stored on a server; everything lives in the browser session.

Known Issues
GitHub API rate limits apply for unauthenticated requests (60 requests per hour). If you hit that cap, wait a bit and try again.

Some stock symbols may not be available through Stooq or Yahoo. Try a different symbol if needed.

CORS can be inconsistent across providers. If one source fails, the app moves on to the next fallback.

Support
If you run into bugs, have suggestions, or just want to say hello, feel free to email me:
omguptaogwhitehathacker@gmil.com

I usually respond within a day or two, unless I’m asleep or building something that is even more interesting.

Credits
Built by Om Gupta, also known as White Hat Hacker — just a curious developer who wanted to keep a lot of useful tools in one place.

Thanks for checking out the project. If you like it, feel free to star it on GitHub and share it with others.

