Website God Mode
Yo! 👋 Welcome to Website God Mode – my little passion project that mashes up a bunch of public APIs into one single‑page dashboard. No backend, no database, no logins, no authentication, no credit cards – nothing to sign up for. Just open the page and start searching.

🚀 What is this?
Imagine you want to search for something – a car, a dev board, a GitHub repo, a stock, or just a Wikipedia article – but you don't want to open five tabs. That's where God Mode comes in. It's like a universal search engine for the stuff I care about: hardware, vehicles, open‑source code, and markets. Plus, it has a Project Forge that randomly generates project ideas by combining stuff from different sources. And an AI Analysis section that gives you quick insights on stocks, repos, or articles – all client‑side, no external AI API needed.

✨ Features
God Search – search across Wikipedia, GitHub, Dev Boards, and Vehicles at once. Results show up in cards with images when available.

Dev Boards – browse and search development boards (Raspberry Pi, Arduino, ESP, etc.) using Wikidata. Partial names work (e.g., "rasp").

Vehicles – search car and motorcycle models from Wikidata. Fuzzy search included.

GitHub Repos – search public repos, view details, star history chart, README preview.

Hack Club – list repositories from the Hack Club org and check if Scrapbook data is available.

Stocks – enter a stock symbol (e.g., AAPL, TSLA, RELIANCE.NS) and get real‑time price and chart. Falls back through multiple data sources if one fails.

AI Analysis – local rule‑based analysis for stocks (bullish/bearish, RSI, volatility), GitHub repos (activity score), Wikipedia articles (summary, keywords), dev boards, and vehicles.

Project Forge – generates random project ideas by mixing hardware, software, and topics.

Support – a mailto link to reach me if something breaks.

🔒 Privacy & Security
I built this with a simple philosophy: your data stays yours. That means:

No logins – you don't create an account, so nothing to remember or leak.

No authentication – no OAuth, no passwords, no tokens.

No credit cards – it's completely free, no hidden paywalls.

No data storage – everything fetches on‑the‑fly and disappears when you close the tab. No analytics, no tracking, no cookies (except maybe the browser's cache for images).

Just a clean, client‑side tool that respects your privacy.

🛠 Tech Stack
Pure HTML5, CSS3, JavaScript (ES6+) – no frameworks, no build tools.

Chart.js for graphs (loaded from CDN).

APIs used:

Wikipedia REST & Query API (search, summaries)

Wikidata SPARQL (dev boards, vehicles)

GitHub REST API (repos, org)

Hack Club Scrapbook API

Stooq / Yahoo Finance for stocks (via CORS proxy api.allorigins.win)

🚀 How to Run
Download or clone this repository.

Open index.html in your browser.

Note: Some browsers block fetch on file://. If you see errors, use a simple local server:

bash
# Python 3
python -m http.server 8000
Then open http://localhost:8000 in your browser.

🧠 How It Works
The whole app is a single‑page application with hash‑based routing. When you click a nav link, the hash changes (e.g., #/vehicles), and the router updates the main content area. All data fetching is done client‑side using fetch, with a simple in‑memory cache (5‑minute TTL) to avoid hammering the APIs.

No data is ever stored on a server – everything lives only in your browser session.

🐛 Known Issues
GitHub API has rate limits (60 requests/hour unauthenticated). If you hit it, wait a bit.

Some stock symbols may not be available on Stooq or Yahoo. Try a different symbol.

CORS can be finicky. If a provider fails, the app tries the next fallback.

📬 Support
If you find bugs, have suggestions, or just want to say hi, email me at:
omguptaogwhitehathacker@gmil.com

I usually reply within a day or two (unless I'm sleeping or building something cooler 😄).

🙏 Credits
Built by Om Gupta (aka White Hat Hacker) – just a curious dev who wanted everything in one place.

Thanks for checking out my project! If you like it, star it on GitHub (omguptaogwhitehathacker-svg) and share it with your friends. 🚀

