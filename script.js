const app = document.getElementById('app');
const cache = new Map();

function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return null;
  const now = Date.now();
  if (now - item.timestamp > 5 * 60 * 1000) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

// ------- Wikipedia search -------
async function searchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=20&prop=description|pageimages&piprop=thumbnail&pithumbsize=200&format=json&origin=*`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Wikipedia search failed');
  const data = await response.json();
  const pages = data.query?.pages || {};
  const results = [];
  for (const pageId in pages) {
    const page = pages[pageId];
    results.push({
      title: page.title,
      description: page.description || '',
      snippet: page.description || '',
      thumbnail: page.thumbnail?.source || null
    });
  }
  return results;
}

// ------- Get full Wikipedia article summary -------
async function getWikipediaDetails(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Wikipedia article not found');
  const data = await response.json();
  return {
    title: data.title,
    extract: data.extract,
    image: data.originalimage?.source || data.thumbnail?.source || null,
    url: data.content_urls?.desktop?.page
  };
}

// ------- Commons image helper -------
async function getCommonsImageUrl(commonsUrl) {
  const fileName = commonsUrl.split('/').pop();
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  const pages = data.query.pages;
  const page = Object.values(pages)[0];
  if (page.imageinfo && page.imageinfo.length > 0) {
    return page.imageinfo[0].thumburl || page.imageinfo[0].url;
  }
  return null;
}

// ------- Dev Boards using Wikidata SPARQL -------
async function searchDevBoards(query = '') {
  const sparql = `
    SELECT ?item ?itemLabel ?itemDescription ?image WHERE {
      VALUES ?type { wd:Q1190176 wd:Q6386235 wd:Q173783 wd:Q848370 }
      ?item wdt:P31 ?type.
      OPTIONAL { ?item wdt:P18 ?image. }
      OPTIONAL { ?item skos:altLabel ?altLabel filter(lang(?altLabel) = "en") }
      ${query ? `FILTER(CONTAINS(LCASE(?itemLabel), "${query.toLowerCase()}") || CONTAINS(LCASE(?altLabel), "${query.toLowerCase()}"))` : ''}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 50
  `;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql);
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('Wikidata query failed');
  const data = await response.json();
  const boards = [];
  for (const binding of data.results.bindings) {
    const id = binding.item.value.split('/').pop();
    boards.push({
      id,
      label: binding.itemLabel?.value || id,
      description: binding.itemDescription?.value || '',
      image: binding.image?.value ? await getCommonsImageUrl(binding.image.value) : null
    });
  }
  return boards;
}

async function getBoardDetails(boardId) {
  const sparql = `
    SELECT ?prop ?propLabel ?value ?valueLabel WHERE {
      wd:${boardId} ?prop ?value.
      ?prop wikibase:propertyType wikibase:WikibaseItem.
      FILTER(?prop != wdt:P31)
      FILTER(?prop != wdt:P18)
      OPTIONAL { ?value rdfs:label ?valueLabel filter (lang(?valueLabel) = "en") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 100
  `;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql);
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('Failed to get board details');
  const data = await response.json();
  const specs = [];
  for (const binding of data.results.bindings) {
    const propLabel = binding.propLabel?.value || binding.prop.value.split('/').pop();
    const value = binding.valueLabel?.value || binding.value.value.split('/').pop();
    specs.push({ label: propLabel, value });
  }
  const labelSparql = `
    SELECT ?itemLabel ?itemDescription ?image WHERE {
      wd:${boardId} rdfs:label ?itemLabel filter (lang(?itemLabel) = "en").
      OPTIONAL { wd:${boardId} schema:description ?itemDescription filter (lang(?itemDescription) = "en"). }
      OPTIONAL { wd:${boardId} wdt:P18 ?image. }
    }
    LIMIT 1
  `;
  const labelUrl = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(labelSparql);
  const labelResponse = await fetch(labelUrl, { headers: { 'Accept': 'application/json' } });
  const labelData = await labelResponse.json();
  const labelBinding = labelData.results.bindings[0];
  return {
    id: boardId,
    label: labelBinding?.itemLabel?.value || boardId,
    description: labelBinding?.itemDescription?.value || '',
    image: labelBinding?.image?.value ? await getCommonsImageUrl(labelBinding.image.value) : null,
    specs,
    url: `https://www.wikidata.org/wiki/${boardId}`
  };
}

// ------- Vehicles using Wikidata SPARQL -------
async function fetchVehicles(query = '') {
  const sparql = `
    SELECT ?item ?itemLabel ?itemDescription ?image WHERE {
      VALUES ?type { wd:Q3231690 wd:Q15056993 }
      ?item wdt:P31 ?type.
      OPTIONAL { ?item wdt:P18 ?image. }
      OPTIONAL { ?item skos:altLabel ?altLabel filter(lang(?altLabel) = "en") }
      ${query ? `FILTER(CONTAINS(LCASE(?itemLabel), "${query.toLowerCase()}") || CONTAINS(LCASE(?altLabel), "${query.toLowerCase()}"))` : ''}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 50
  `;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql);
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('Wikidata query failed');
  const data = await response.json();
  const vehicles = [];
  for (const binding of data.results.bindings) {
    const id = binding.item.value.split('/').pop();
    vehicles.push({
      id,
      label: binding.itemLabel?.value || id,
      description: binding.itemDescription?.value || '',
      image: binding.image?.value ? await getCommonsImageUrl(binding.image.value) : null
    });
  }
  return vehicles;
}

async function getVehicleDetails(vehicleId) {
  const sparql = `
    SELECT ?prop ?propLabel ?value ?valueLabel WHERE {
      wd:${vehicleId} ?prop ?value.
      ?prop wikibase:propertyType wikibase:WikibaseItem.
      FILTER(?prop != wdt:P31)
      FILTER(?prop != wdt:P18)
      OPTIONAL { ?value rdfs:label ?valueLabel filter (lang(?valueLabel) = "en") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 100
  `;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql);
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('Failed to get vehicle details');
  const data = await response.json();
  const specs = [];
  for (const binding of data.results.bindings) {
    const propLabel = binding.propLabel?.value || binding.prop.value.split('/').pop();
    const value = binding.valueLabel?.value || binding.value.value.split('/').pop();
    specs.push({ label: propLabel, value });
  }
  const labelSparql = `
    SELECT ?itemLabel ?itemDescription ?image WHERE {
      wd:${vehicleId} rdfs:label ?itemLabel filter (lang(?itemLabel) = "en").
      OPTIONAL { wd:${vehicleId} schema:description ?itemDescription filter (lang(?itemDescription) = "en"). }
      OPTIONAL { wd:${vehicleId} wdt:P18 ?image. }
    }
    LIMIT 1
  `;
  const labelUrl = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(labelSparql);
  const labelResponse = await fetch(labelUrl, { headers: { 'Accept': 'application/json' } });
  const labelData = await labelResponse.json();
  const labelBinding = labelData.results.bindings[0];
  return {
    id: vehicleId,
    label: labelBinding?.itemLabel?.value || vehicleId,
    description: labelBinding?.itemDescription?.value || '',
    image: labelBinding?.image?.value ? await getCommonsImageUrl(labelBinding.image.value) : null,
    specs,
    url: `https://www.wikidata.org/wiki/${vehicleId}`
  };
}

// ------- GitHub -------
async function searchRepositories(query) {
  if (!query) return [];
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
  const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
  if (!response.ok) {
    if (response.status === 403) throw new Error('GitHub rate limit exceeded. Try again later.');
    throw new Error(`GitHub search failed (${response.status})`);
  }
  const data = await response.json();
  return data.items.map(repo => ({
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    description: repo.description || '',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    html_url: repo.html_url,
    avatar_url: repo.owner.avatar_url
  }));
}

async function getRepoDetails(owner, repoName) {
  const url = `https://api.github.com/repos/${owner}/${repoName}`;
  const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
  if (!response.ok) {
    if (response.status === 403) throw new Error('GitHub rate limit exceeded.');
    if (response.status === 404) throw new Error('Repository not found.');
    throw new Error(`Failed to fetch repo (${response.status})`);
  }
  const repo = await response.json();
  return {
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    description: repo.description || '',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    language: repo.language,
    license: repo.license?.spdx_id || 'None',
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    html_url: repo.html_url,
    avatar_url: repo.owner.avatar_url
  };
}

async function getStarHistory(owner, repoName) {
  try {
    const perPage = 100;
    const url = `https://api.github.com/repos/${owner}/${repoName}/stargazers?per_page=${perPage}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github.star+json' } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map(u => new Date(u.starred_at).getTime()).sort((a,b) => a-b);
  } catch (e) {
    return [];
  }
}

async function getRepoREADME(owner, repoName) {
  const branches = ['main', 'master'];
  const files = ['README.md', 'readme.md', 'README.rst', 'Readme.md', 'README'];
  for (const branch of branches) {
    for (const file of files) {
      const url = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${file}`;
      try {
        const response = await fetch(url);
        if (response.ok) return await response.text();
      } catch (e) {}
    }
  }
  return null;
}

// ------- Hack Club -------
async function getHackClubRepos() {
  const url = `https://api.github.com/orgs/hackclub/repos?per_page=30&sort=updated`;
  const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
  if (!response.ok) throw new Error('Failed to fetch Hack Club repos');
  const repos = await response.json();
  return repos.map(repo => ({
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    description: repo.description || '',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    html_url: repo.html_url,
    avatar_url: repo.owner.avatar_url,
    owner: repo.owner.login
  }));
}

async function getHackClubScrapbook() {
  const url = 'https://scrapbook.hackclub.com/api/users/';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Scrapbook API unavailable');
    return await response.json();
  } catch (e) {
    return null;
  }
}

// ------- Stocks (with fallbacks) -------
async function getStockData(symbol) {
  const proxy = 'https://api.allorigins.win/raw?url=';
  // Try Stooq daily data first
  try {
    const dailyUrl = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
    const response = await fetch(proxy + encodeURIComponent(dailyUrl));
    if (response.ok) {
      const csv = await response.text();
      const lines = csv.trim().split('\n');
      if (lines.length >= 2) {
        const header = lines[0].split(',');
        const dateIdx = header.indexOf('Date');
        const closeIdx = header.indexOf('Close');
        const openIdx = header.indexOf('Open');
        if (dateIdx !== -1 && closeIdx !== -1) {
          const data = [];
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            const date = parts[dateIdx];
            const close = parseFloat(parts[closeIdx]);
            const open = openIdx !== -1 ? parseFloat(parts[openIdx]) : close;
            if (!isNaN(close)) data.push({ date, close, open });
          }
          if (data.length > 0) {
            const latest = data[data.length - 1];
            const previous = data[data.length - 2] || data[0];
            const change = latest.close - previous.close;
            const changePercent = (change / previous.close) * 100;
            const chartData = data.slice(-20).map(d => d.close);
            return {
              symbol,
              price: latest.close,
              change,
              changePercent,
              historical: data,
              chart: {
                labels: data.slice(-20).map(d => d.date),
                data: chartData
              }
            };
          }
        }
      }
    }
  } catch (e) {}

  // Yahoo Finance direct
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
    const response = await fetch(yahooUrl);
    if (response.ok) {
      const data = await response.json();
      const result = data.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      const closes = quotes.close;
      const labels = timestamps.map(ts => new Date(ts * 1000).toLocaleTimeString());
      const chartData = closes.map((c, i) => ({ x: labels[i], y: c })).filter(p => p.y !== null);
      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - meta.chartPreviousClose,
        changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        historical: null,
        chart: {
          labels: chartData.map(p => p.x),
          data: chartData.map(p => p.y)
        }
      };
    }
  } catch (e) {}

  // Yahoo Finance via proxy
  try {
    const yahooProxyUrl = proxy + encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`);
    const response = await fetch(yahooProxyUrl);
    if (response.ok) {
      const data = await response.json();
      const result = data.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      const closes = quotes.close;
      const labels = timestamps.map(ts => new Date(ts * 1000).toLocaleTimeString());
      const chartData = closes.map((c, i) => ({ x: labels[i], y: c })).filter(p => p.y !== null);
      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - meta.chartPreviousClose,
        changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        historical: null,
        chart: {
          labels: chartData.map(p => p.x),
          data: chartData.map(p => p.y)
        }
      };
    }
  } catch (e) {}

  // Last try: Stooq single quote
  try {
    const stooqUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
    const response = await fetch(proxy + encodeURIComponent(stooqUrl));
    if (response.ok) {
      const csv = await response.text();
      const lines = csv.trim().split('\n');
      if (lines.length >= 2) {
        const header = lines[0].split(',');
        const dataLine = lines[1].split(',');
        const price = parseFloat(dataLine[header.indexOf('Close')]);
        const prevClose = parseFloat(dataLine[header.indexOf('Open')]);
        if (!isNaN(price) && !isNaN(prevClose)) {
          return {
            symbol,
            price,
            change: price - prevClose,
            changePercent: ((price - prevClose) / prevClose) * 100,
            historical: null,
            chart: {
              labels: ['Open', 'Close'],
              data: [prevClose, price]
            }
          };
        }
      }
    }
  } catch (e) {}

  throw new Error('Failed to fetch stock data. Please check symbol or try again later.');
}

/* ==================== AI ANALYSIS ==================== */
function calculateRSI(stockData) {
  const closes = stockData.historical ? stockData.historical.map(d => d.close) : stockData.chart.data;
  if (closes.length < 15) return 'Insufficient data';
  let gains = 0, losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return (100 - (100 / (1 + rs))).toFixed(2);
}

function calculateVolatility(stockData) {
  const closes = stockData.historical ? stockData.historical.map(d => d.close) : stockData.chart.data;
  if (closes.length < 2) return 'Insufficient data';
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  return ((high - low) / low * 100).toFixed(2) + '%';
}

function getRecentMovement(stockData) {
  const closes = stockData.historical ? stockData.historical.map(d => d.close) : stockData.chart.data;
  if (closes.length >= 5) {
    const last5 = closes.slice(-5);
    const avg = last5.reduce((sum, val) => sum + val, 0) / last5.length;
    const latest = closes[closes.length - 1];
    const changePct = ((latest - avg) / avg) * 100;
    if (changePct > 0.3) return { label: 'Bullish', emoji: '📈' };
    else if (changePct < -0.3) return { label: 'Bearish', emoji: '📉' };
    else return { label: 'Sideways', emoji: '➡️' };
  }
  return { label: 'Not enough data', emoji: '❓' };
}

function calculateRepoActivity(repo) {
  const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  const activity = (repo.stars * 2) + (repo.forks * 1) - (daysSinceUpdate * 0.1);
  return Math.max(0, activity).toFixed(0);
}

function repoActivityVerdict(repo) {
  const activity = calculateRepoActivity(repo);
  if (activity > 1000) return '🔥 Very active and popular';
  if (activity > 100) return '✅ Active';
  return '⚠️ Low activity';
}

function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const freq = {};
  words.forEach(w => {
    if (!stopWords.has(w) && w.length > 3) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 5).map(e => e[0]);
}

/* ==================== AI ANALYSIS MAIN FUNCTION ==================== */
async function analyzeItem(input) {
  // If it looks like owner/repo
  if (input.includes('/')) {
    const [owner, repoName] = input.split('/');
    try {
      const repo = await getRepoDetails(owner, repoName);
      return `
        <h3>GitHub Repo Analysis: ${repo.full_name}</h3>
        <p><strong>Stars:</strong> ${repo.stars}</p>
        <p><strong>Forks:</strong> ${repo.forks}</p>
        <p><strong>Open Issues:</strong> ${repo.open_issues}</p>
        <p><strong>Language:</strong> ${repo.language || 'N/A'}</p>
        <p><strong>License:</strong> ${repo.license}</p>
        <p><strong>Activity Score:</strong> ${calculateRepoActivity(repo)}</p>
        <p>Recommendation: ${repoActivityVerdict(repo)}</p>
      `;
    } catch (e) {
      throw new Error('GitHub analysis failed: ' + e.message);
    }
  }

  // If it matches a stock symbol (all caps/numbers/dots)
  if (/^[A-Z0-9.]+$/.test(input) && input.length <= 10) {
    try {
      const data = await getStockData(input);
      const movement = getRecentMovement(data);
      return `
        <h3>Stock Analysis: ${data.symbol}</h3>
        <p><strong>Price:</strong> $${data.price.toFixed(2)}</p>
        <p><strong>Change:</strong> ${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)</p>
        <p><strong>Recent Movement:</strong> ${movement.emoji} ${movement.label}</p>
        <p><strong>RSI (14):</strong> ${calculateRSI(data)}</p>
        <p><strong>Volatility:</strong> ${calculateVolatility(data)}</p>
        <p><strong>Recommendation:</strong> ${movement.label === 'Bullish' ? '📈 Upward momentum' : movement.label === 'Bearish' ? '📉 Downward momentum' : '➡️ Neutral'}</p>
      `;
    } catch (e) {}
  }

  // Try Wikipedia first
  try {
    const wikiResults = await searchWikipedia(input);
    if (wikiResults.length > 0) {
      const wiki = await getWikipediaDetails(wikiResults[0].title);
      if (wiki && wiki.extract) {
        return `
          <h3>Wikipedia Article Analysis: ${wiki.title}</h3>
          <p><strong>Summary:</strong> ${wiki.extract.slice(0, 300)}...</p>
          <p><strong>Reading Time:</strong> ~${Math.ceil(wiki.extract.split(' ').length / 200)} min</p>
          <p><strong>Keywords:</strong> ${extractKeywords(wiki.extract).join(', ')}</p>
        `;
      }
    }
  } catch (e) {}

  // Then dev boards
  try {
    const boards = await searchDevBoards(input);
    if (boards.length > 0) {
      const board = await getBoardDetails(boards[0].id);
      return `
        <h3>Dev Board Analysis: ${board.label}</h3>
        <p><strong>Description:</strong> ${board.description || 'N/A'}</p>
        <p><strong>Specifications:</strong> ${board.specs.map(s => `${s.label}: ${s.value}`).join('; ') || 'N/A'}</p>
      `;
    }
  } catch (e) {}

  // Then vehicles
  try {
    const vehicles = await fetchVehicles(input);
    if (vehicles.length > 0) {
      const vehicle = await getVehicleDetails(vehicles[0].id);
      return `
        <h3>Vehicle Analysis: ${vehicle.label}</h3>
        <p><strong>Description:</strong> ${vehicle.description || 'N/A'}</p>
        <p><strong>Specifications:</strong> ${vehicle.specs.map(s => `${s.label}: ${s.value}`).join('; ') || 'N/A'}</p>
      `;
    }
  } catch (e) {}

  throw new Error('Could not identify the item. Try a stock symbol (e.g., AAPL), GitHub repo (owner/repo), or a keyword for Wikipedia/Dev Boards/Vehicles.');
}

/* ==================== PROJECT FORGE ==================== */
async function generateProjectIdeas() {
  const topics = ['IoT', 'machine learning', 'environment', 'health', 'robotics', 'audio', 'gaming'];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const [boards, repos, wikiArticles] = await Promise.allSettled([
    searchDevBoards(''),
    searchRepositories(randomTopic),
    searchWikipedia(randomTopic)
  ]);

  const board = boards.status === 'fulfilled' && boards.value.length ? boards.value[Math.floor(Math.random() * boards.value.length)] : null;
  const repo = repos.status === 'fulfilled' && repos.value.length ? repos.value[Math.floor(Math.random() * repos.value.length)] : null;
  const wiki = wikiArticles.status === 'fulfilled' && wikiArticles.value.length ? wikiArticles.value[Math.floor(Math.random() * wikiArticles.value.length)] : null;

  const ideas = [];

  if (board && repo) {
    ideas.push({
      title: `Build a ${board.label} project using ${repo.full_name}`,
      description: `Combine the hardware capabilities of ${board.label} with the software from ${repo.full_name}.`,
      components: [board.label, repo.full_name, repo.language || 'code']
    });
  }
  if (board && wiki) {
    ideas.push({
      title: `${wiki.title} on ${board.label}`,
      description: `Create a device that visualizes or interacts with data related to ${wiki.title} using ${board.label}.`,
      components: [board.label, wiki.title, 'web dashboard']
    });
  }
  if (repo && wiki) {
    ideas.push({
      title: `Enhance ${repo.full_name} with ${wiki.title}`,
      description: `Use insights from ${wiki.title} to add new features to ${repo.full_name}.`,
      components: [repo.full_name, wiki.title, 'API integration']
    });
  }
  ideas.push({
    title: `Monitor ${randomTopic} in real-time`,
    description: `Build a dashboard that tracks ${randomTopic} metrics using public APIs and displays them on a web interface.`,
    components: ['Web dashboard', 'Public API', 'Chart.js']
  });

  return ideas;
}

/* ==================== UI ROUTER ==================== */
function router() {
  const hash = location.hash || '#/';
  const parts = hash.split('/');
  const section = parts[1] || 'home';
  const params = parts.slice(2).map(decodeURIComponent);

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === section);
  });

  switch (section) {
    case 'home': renderHome(); break;
    case 'devboards': renderDevBoards(params); break;
    case 'github': renderGitHub(params); break;
    case 'hackclub': renderHackClub(params); break;
    case 'vehicles': renderVehicles(params); break;
    case 'stocks': renderStocks(params); break;
    case 'ai': renderAI(); break;
    case 'forge': renderProjectForge(); break;
    case 'support': renderSupport(); break;
    case 'wiki': if (params.length === 1) renderWikipediaDetail(params[0]); else renderHome(); break;
    default: renderHome();
  }
}

/* ==================== HOME (God Search) ==================== */
function renderHome() {
  app.innerHTML = `
    <h2>🔍 God Search</h2>
    <p>Welcome to <strong>Website God Mode</strong> – your all‑in‑one gateway to the world’s knowledge, hardware, and markets. This single‑page application fetches live data from multiple public sources on demand, without storing any information on a server.</p>
    <div class="section-ref">About this project: Website God Mode is a client‑side aggregator that connects to Wikipedia, GitHub, Hack Club, Wikidata, and financial APIs to bring you instant results across encyclopedic articles, development boards, vehicles, repositories, and stocks. Built with pure HTML, CSS, and JavaScript, it requires no backend and leaves no data trail. Use the navigation bar to explore specialized sections, or search across all sources simultaneously below.</div>
    <div class="search-bar">
      <input type="text" id="god-search-input" placeholder="Search anything..." />
      <button id="god-search-btn">Search</button>
    </div>
    <div id="search-results"></div>
  `;
  document.getElementById('god-search-btn').addEventListener('click', performUnifiedSearch);
  document.getElementById('god-search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') performUnifiedSearch();
  });
}

async function performUnifiedSearch() {
  const query = document.getElementById('god-search-input').value.trim();
  if (!query) return;
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '<div class="loading">Searching all sources...</div>';

  const [wikiResults, githubResults, boardResults, vehicleResults] = await Promise.allSettled([
    searchWikipedia(query),
    searchRepositories(query),
    searchDevBoards(query),
    fetchVehicles(query)
  ]);

  let html = '';

  if (wikiResults.status === 'fulfilled' && wikiResults.value.length) {
    html += '<h3>📚 Wikipedia</h3><div class="card-grid">';
    wikiResults.value.slice(0, 10).forEach(item => {
      html += `
        <div class="card" onclick="location.hash='#/wiki/${encodeURIComponent(item.title)}'">
          ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}" loading="lazy">` : ''}
          <div class="card-body">
            <div class="card-title">${item.title}</div>
            <div class="card-description">${item.description || ''}</div>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  if (githubResults.status === 'fulfilled' && githubResults.value.length) {
    html += '<h3> GitHub Repositories</h3><div class="card-grid">';
    githubResults.value.slice(0, 10).forEach(repo => {
      html += `
        <div class="card" onclick="location.hash='#/github/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}'">
          <div class="card-body">
            <div class="card-title">${repo.full_name}</div>
            <div class="card-description">${repo.description || ''}</div>
            <div class="repo-stats"> ${repo.stars}</div>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  if (boardResults.status === 'fulfilled' && boardResults.value.length) {
    html += '<h3> Dev Boards</h3><div class="card-grid">';
    boardResults.value.slice(0, 10).forEach(board => {
      html += `
        <div class="card" onclick="location.hash='#/devboards/${encodeURIComponent(board.id)}'">
          ${board.image ? `<img src="${board.image}" alt="${board.label}" loading="lazy">` : ''}
          <div class="card-body">
            <div class="card-title">${board.label}</div>
            <div class="card-description">${board.description || ''}</div>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  if (vehicleResults.status === 'fulfilled' && vehicleResults.value.length) {
    html += '<h3>🏎️ Vehicles</h3><div class="card-grid">';
    vehicleResults.value.slice(0, 10).forEach(v => {
      html += `
        <div class="card" onclick="location.hash='#/vehicles/${encodeURIComponent(v.id)}'">
          ${v.image ? `<img src="${v.image}" alt="${v.label}" loading="lazy">` : ''}
          <div class="card-body">
            <div class="card-title">${v.label}</div>
            <div class="card-description">${v.description || ''}</div>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  if (!html) html = '<p>No results found across any source.</p>';
  resultsContainer.innerHTML = html;
}

/* ==================== WIKIPEDIA DETAIL ==================== */
async function renderWikipediaDetail(title) {
  app.innerHTML = '<div class="loading">Loading Wikipedia article...</div>';
  try {
    const cached = cacheGet(`wiki_${title}`);
    let details;
    if (cached) details = cached;
    else {
      details = await getWikipediaDetails(title);
      cacheSet(`wiki_${title}`, details);
    }
    app.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Back</button>
      <div class="detail-panel">
        <h2>${details.title}</h2>
        ${details.image ? `<img src="${details.image}" referrerpolicy="no-referrer">` : ''}
        <p>${details.extract || ''}</p>
        <p><a href="${details.url}" target="_blank" rel="noopener">Read full article on Wikipedia ↗</a></p>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

/* ==================== DEV BOARDS SECTION ==================== */
async function renderDevBoards(params) {
  if (params.length === 1 && params[0] !== '') {
    const boardId = params[0];
    app.innerHTML = '<div class="loading">Loading board details...</div>';
    try {
      const cached = cacheGet(`board_${boardId}`);
      let board;
      if (cached) board = cached;
      else {
        board = await getBoardDetails(boardId);
        cacheSet(`board_${boardId}`, board);
      }
      showBoardDetail(board);
    } catch (err) {
      app.innerHTML = `<div class="error">${err.message}</div>`;
    }
    return;
  }

  app.innerHTML = `
    <h2>Dev Boards</h2>
    <p class="section-ref">Source: Wikidata SPARQL (single‑board computers & microcontrollers)</p>
    <p>Search hardware development boards. Partial names and aliases are supported.</p>
    <div class="search-bar">
      <input type="text" id="board-search-input" placeholder="e.g., rasp, arduino, esp" />
      <button id="board-search-btn">Search</button>
    </div>
    <div id="board-results"></div>
  `;
  document.getElementById('board-search-btn').addEventListener('click', searchBoards);
  document.getElementById('board-search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchBoards();
  });
  searchBoards();
}

async function searchBoards() {
  const input = document.getElementById('board-search-input');
  const query = input ? input.value.trim() : '';
  const resultsContainer = document.getElementById('board-results');
  resultsContainer.innerHTML = '<div class="loading">Querying Wikidata...</div>';
  try {
    const cached = cacheGet(`boards_${query}`);
    let boards;
    if (cached) boards = cached;
    else {
      boards = await searchDevBoards(query);
      cacheSet(`boards_${query}`, boards);
    }
    displayBoardResults(boards, resultsContainer);
  } catch (err) {
    resultsContainer.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function displayBoardResults(boards, container) {
  if (boards.length === 0) {
    container.innerHTML = '<p>No boards found. Try a broader term.</p>';
    return;
  }
  container.innerHTML = '<div class="card-grid"></div>';
  const grid = container.querySelector('.card-grid');
  boards.forEach(board => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${board.image ? `<img src="${board.image}" alt="${board.label}" loading="lazy">` : ''}
      <div class="card-body">
        <div class="card-title">${board.label}</div>
        <div class="card-description">${board.description || ''}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      location.hash = `#/devboards/${encodeURIComponent(board.id)}`;
    });
    grid.appendChild(card);
  });
}

function showBoardDetail(board) {
  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← Back</button>
    <div class="detail-panel">
      <h2>${board.label}</h2>
      ${board.image ? `<img src="${board.image}" referrerpolicy="no-referrer">` : ''}
      <p>${board.description || ''}</p>
      <h3>Specifications</h3>
      <table>
        <tbody>
          ${board.specs.map(spec => `<tr><td><strong>${spec.label}</strong></td><td>${spec.value}</td></tr>`).join('')}
        </tbody>
      </table>
      <p><a href="${board.url}" target="_blank" rel="noopener">View on Wikidata →</a></p>
    </div>
  `;
}

/* ==================== GITHUB SECTION ==================== */
function renderGitHub(params) {
  if (params.length === 2) {
    const owner = params[0];
    const repoName = params[1];
    app.innerHTML = '<div class="loading">Loading repository...</div>';
    loadGitHubRepoDetails(owner, repoName);
    return;
  }
  app.innerHTML = `
    <h2> GitHub Repos</h2>
    <p class="section-ref">Source: GitHub REST API (public repositories)</p>
    <p>Search public repositories. Enter keywords or partial names.</p>
    <div class="search-bar">
      <input type="text" id="github-search-input" placeholder="e.g., machine learning, react" />
      <button id="github-search-btn">Search</button>
    </div>
    <div id="github-results"></div>
  `;
  document.getElementById('github-search-btn').addEventListener('click', searchGitHub);
  document.getElementById('github-search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchGitHub();
  });
}

async function searchGitHub() {
  const query = document.getElementById('github-search-input').value.trim();
  if (!query) return;
  const resultsContainer = document.getElementById('github-results');
  resultsContainer.innerHTML = '<div class="loading">Searching GitHub...</div>';
  try {
    const cached = cacheGet(`gh_${query}`);
    let repos;
    if (cached) repos = cached;
    else {
      repos = await searchRepositories(query);
      cacheSet(`gh_${query}`, repos);
    }
    displayGitHubRepos(repos, resultsContainer);
  } catch (err) {
    resultsContainer.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function displayGitHubRepos(repos, container) {
  if (repos.length === 0) {
    container.innerHTML = '<p>No repositories found.</p>';
    return;
  }
  container.innerHTML = '<div class="card-grid"></div>';
  const grid = container.querySelector('.card-grid');
  repos.forEach(repo => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-body">
        <div class="card-title"><img src="${repo.avatar_url}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:8px;">${repo.full_name}</div>
        <div class="card-description">${repo.description || ''}</div>
        <div class="repo-stats"> ${repo.stars}  🍴 ${repo.forks}  ${repo.language ? '🔤 '+repo.language : ''}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      location.hash = `#/github/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
    });
    grid.appendChild(card);
  });
}

async function loadGitHubRepoDetails(owner, repoName) {
  try {
    const repoKey = `repo_${owner}_${repoName}`;
    const cachedRepo = cacheGet(repoKey);
    let repo;
    if (cachedRepo) repo = cachedRepo;
    else {
      repo = await getRepoDetails(owner, repoName);
      cacheSet(repoKey, repo);
    }
    const readme = await getRepoREADME(owner, repoName).catch(() => null);
    const starDates = await getStarHistory(owner, repoName).catch(() => []);
    showGitHubRepoDetail(repo, readme, starDates);
  } catch (err) {
    app.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function showGitHubRepoDetail(repo, readme, starDates) {
  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← Back</button>
    <div class="detail-panel">
      <h2><img src="${repo.avatar_url}" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:10px;">${repo.full_name}</h2>
      <p>${repo.description || ''}</p>
      <table>
        <tr><td><strong>Stars</strong></td><td>${repo.stars}</td></tr>
        <tr><td><strong>Forks</strong></td><td>${repo.forks}</td></tr>
        <tr><td><strong>Open Issues</strong></td><td>${repo.open_issues}</td></tr>
        <tr><td><strong>Language</strong></td><td>${repo.language || 'N/A'}</td></tr>
        <tr><td><strong>License</strong></td><td>${repo.license}</td></tr>
        <tr><td><strong>Created</strong></td><td>${new Date(repo.created_at).toLocaleDateString()}</td></tr>
        <tr><td><strong>Last Updated</strong></td><td>${new Date(repo.updated_at).toLocaleDateString()}</td></tr>
      </table>
      <p><a href="${repo.html_url}" target="_blank" rel="noopener">View on GitHub ↗</a></p>
      ${starDates.length > 0 ? `<canvas id="star-chart" style="width:100%;height:300px;margin-top:20px;"></canvas>` : '<p>Star history not available.</p>'}
      ${readme ? `<h3>README (first 500 chars)</h3><pre style="white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,0.3);padding:1rem;border-radius:8px;">${readme.slice(0, 500)}...</pre>` : ''}
    </div>
  `;
  if (starDates.length > 0) {
    const ctx = document.getElementById('star-chart').getContext('2d');
    const counts = {};
    starDates.forEach(date => {
      const day = new Date(date).toLocaleDateString();
      counts[day] = (counts[day] || 0) + 1;
    });
    const labels = Object.keys(counts).sort();
    const cumulative = [];
    let total = 0;
    labels.forEach(day => {
      total += counts[day];
      cumulative.push(total);
    });
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Stars over time (cumulative)',
          data: cumulative,
          borderColor: '#e63946',
          backgroundColor: 'rgba(230,57,70,0.2)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#5c3a3a' }, grid: { color: 'rgba(0,0,0,0.1)' } },
          y: { ticks: { color: '#5c3a3a' }, grid: { color: 'rgba(0,0,0,0.1)' } }
        },
        plugins: { legend: { labels: { color: '#5c3a3a' } } }
      }
    });
  }
}

/* ==================== HACK CLUB SECTION ==================== */
async function renderHackClub(params) {
  app.innerHTML = '<div class="loading">Loading Hack Club data...</div>';
  try {
    const cached = cacheGet('hackclub_repos');
    let repos;
    if (cached) repos = cached;
    else {
      repos = await getHackClubRepos();
      cacheSet('hackclub_repos', repos);
    }
    const scrapbook = await getHackClubScrapbook().catch(() => null);
    showHackClub(repos, scrapbook);
  } catch (err) {
    app.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function showHackClub(repos, scrapbook) {
  app.innerHTML = `
    <h2> Hack Club</h2>
    <p class="section-ref">Source: Hack Club GitHub org & Scrapbook API</p>
    <p>Open‑source organization and community.</p>
    ${scrapbook ? `<div class="notice">Scrapbook data available (${Array.isArray(scrapbook) ? scrapbook.length + ' entries' : 'non‑list'})</div>` : '<div class="notice">Scrapbook data unavailable.</div>'}
    <h3>Repositories</h3>
    <div class="card-grid"></div>
  `;
  const grid = app.querySelector('.card-grid');
  repos.forEach(repo => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">${repo.full_name}</div>
        <div class="card-description">${repo.description || ''}</div>
        <div class="repo-stats"> ${repo.stars}  🍴 ${repo.forks}  ${repo.language ? '🔤 '+repo.language : ''}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      location.hash = `#/github/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
    });
    grid.appendChild(card);
  });
  if (repos.length === 0) {
    grid.innerHTML = '<p>No repos found.</p>';
  }
}

/* ==================== VEHICLES SECTION ==================== */
async function renderVehicles(params) {
  if (params.length === 1 && params[0] !== '') {
    const vehicleId = params[0];
    app.innerHTML = '<div class="loading">Loading vehicle details...</div>';
    try {
      const cached = cacheGet(`vehicle_${vehicleId}`);
      let vehicle;
      if (cached) vehicle = cached;
      else {
        vehicle = await getVehicleDetails(vehicleId);
        cacheSet(`vehicle_${vehicleId}`, vehicle);
      }
      showVehicleDetail(vehicle);
    } catch (err) {
      app.innerHTML = `<div class="error">${err.message}</div>`;
    }
    return;
  }

  app.innerHTML = `
    <h2>🏎️ Vehicles</h2>
    <p class="section-ref">Source: Wikidata SPARQL (car & motorcycle models)</p>
    <p>Search vehicles by partial name or alias. E.g., "civic", "tesla", "ninja".</p>
    <div class="search-bar">
      <input type="text" id="vehicle-search-input" placeholder="e.g., suzuki, honda, tesla" />
      <button id="vehicle-search-btn">Search</button>
    </div>
    <div id="vehicle-results"></div>
  `;
  document.getElementById('vehicle-search-btn').addEventListener('click', searchVehicles);
  document.getElementById('vehicle-search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchVehicles();
  });
}

async function searchVehicles() {
  const input = document.getElementById('vehicle-search-input');
  const query = input ? input.value.trim() : '';
  const resultsContainer = document.getElementById('vehicle-results');
  resultsContainer.innerHTML = '<div class="loading">Querying Wikidata...</div>';
  try {
    const cached = cacheGet(`vehicles_${query}`);
    let vehicles;
    if (cached) vehicles = cached;
    else {
      vehicles = await fetchVehicles(query);
      cacheSet(`vehicles_${query}`, vehicles);
    }
    displayVehicleResults(vehicles, resultsContainer);
  } catch (err) {
    resultsContainer.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function displayVehicleResults(vehicles, container) {
  if (vehicles.length === 0) {
    container.innerHTML = '<p>No vehicles found. Try a broader term.</p>';
    return;
  }
  container.innerHTML = '<div class="card-grid"></div>';
  const grid = container.querySelector('.card-grid');
  vehicles.forEach(v => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${v.image ? `<img src="${v.image}" alt="${v.label}" loading="lazy">` : ''}
      <div class="card-body">
        <div class="card-title">${v.label}</div>
        <div class="card-description">${v.description || ''}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      location.hash = `#/vehicles/${encodeURIComponent(v.id)}`;
    });
    grid.appendChild(card);
  });
}

function showVehicleDetail(vehicle) {
  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← Back</button>
    <div class="detail-panel">
      <h2>${vehicle.label}</h2>
      ${vehicle.image ? `<img src="${vehicle.image}" referrerpolicy="no-referrer">` : ''}
      <p>${vehicle.description || ''}</p>
      <h3>Specifications</h3>
      <table>
        <tbody>
          ${vehicle.specs.map(spec => `<tr><td><strong>${spec.label}</strong></td><td>${spec.value}</td></tr>`).join('')}
        </tbody>
      </table>
      <p><a href="${vehicle.url}" target="_blank" rel="noopener">View on Wikidata →</a></p>
    </div>
  `;
}

/* ==================== STOCKS SECTION ==================== */
function renderStocks(params) {
  app.innerHTML = `
    <h2> Stocks</h2>
    <p class="section-ref">Source: Stooq / Yahoo Finance (via CORS proxy)</p>
    <p>Enter a stock symbol (e.g., AAPL, TSLA, RELIANCE.NS).</p>
    <div class="search-bar">
      <input type="text" id="stock-search-input" placeholder="Enter symbol" />
      <button id="stock-search-btn">Get Quote</button>
    </div>
    <div id="stock-results"></div>
  `;
  document.getElementById('stock-search-btn').addEventListener('click', searchStock);
  document.getElementById('stock-search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchStock();
  });
}

async function searchStock() {
  const symbol = document.getElementById('stock-search-input').value.trim().toUpperCase();
  if (!symbol) return;
  const resultsContainer = document.getElementById('stock-results');
  resultsContainer.innerHTML = '<div class="loading">Fetching stock data...</div>';
  try {
    const cached = cacheGet(`stock_${symbol}`);
    let data;
    if (cached) data = cached;
    else {
      data = await getStockData(symbol);
      cacheSet(`stock_${symbol}`, data);
    }
    displayStock(data, resultsContainer);
  } catch (err) {
    resultsContainer.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function displayStock(data, container) {
  container.innerHTML = `
    <div class="detail-panel">
      <h2>${data.symbol}</h2>
      <p>Current Price: $${data.price.toFixed(2)}</p>
      <p>Change: ${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)</p>
      <canvas id="stock-chart" style="width:100%;height:300px;"></canvas>
    </div>
  `;
  const ctx = document.getElementById('stock-chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.chart.labels,
      datasets: [{
        label: 'Price',
        data: data.chart.data,
        borderColor: '#e63946',
        backgroundColor: 'rgba(230,57,70,0.2)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#5c3a3a' }, grid: { color: 'rgba(0,0,0,0.1)' } },
        y: { ticks: { color: '#5c3a3a' }, grid: { color: 'rgba(0,0,0,0.1)' } }
      },
      plugins: { legend: { labels: { color: '#5c3a3a' } } }
    }
  });
}

/* ==================== AI ANALYSIS SECTION ==================== */
function renderAI() {
  app.innerHTML = `
    <h2> AI Analysis</h2>
    <p class="section-ref">Local rule‑based analysis (no external AI API required)</p>
    <p>Enter a stock symbol, GitHub repo (owner/repo), or any keyword for Wikipedia, Dev Boards, or Vehicles. Partial names work.</p>
    <div class="search-bar">
      <input type="text" id="ai-input" placeholder="e.g., AAPL, microsoft/vscode, rasp, civic" />
      <button id="ai-analyze-btn">Analyze</button>
    </div>
    <div id="ai-results"></div>
  `;
  document.getElementById('ai-analyze-btn').addEventListener('click', runAI);
  document.getElementById('ai-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') runAI();
  });
}

async function runAI() {
  const input = document.getElementById('ai-input').value.trim();
  if (!input) return;
  const resultsContainer = document.getElementById('ai-results');
  resultsContainer.innerHTML = '<div class="loading">Running AI analysis...</div>';
  try {
    const result = await analyzeItem(input);
    resultsContainer.innerHTML = `<div class="ai-result">${result}</div>`;
  } catch (err) {
    resultsContainer.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

/* ==================== PROJECT FORGE SECTION ==================== */
async function renderProjectForge() {
  app.innerHTML = `
    <h2> Project Forge</h2>
    <p class="section-ref">Combines data from all sources</p>
    <p>Generate brand‑new project ideas by mixing hardware, software, and trending topics.</p>
    <button id="forge-btn" class="search-bar button">Generate Project Ideas</button>
    <div id="forge-results"></div>
  `;
  document.getElementById('forge-btn').addEventListener('click', generateForge);
  generateForge();
}

async function generateForge() {
  const resultsContainer = document.getElementById('forge-results');
  resultsContainer.innerHTML = '<div class="loading">Generating project ideas...</div>';
  try {
    const ideas = await generateProjectIdeas();
    resultsContainer.innerHTML = ideas.map(idea => `
      <div class="project-idea">
        <h3>${idea.title}</h3>
        <p>${idea.description}</p>
        <p><strong>Components:</strong> ${idea.components.join(', ')}</p>
      </div>
    `).join('');
  } catch (err) {
    resultsContainer.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

/* ==================== SUPPORT SECTION ==================== */
function renderSupport() {
  app.innerHTML = `
    <h2> Support</h2>
    <p>Need help? Have questions or feedback? Reach out directly to the developer.</p>
    <div class="detail-panel">
      <p><strong>Email:</strong> <a href="mailto:omguptaogwhitehathacker@gmil.com" style="color:#e63946;">omguptaogwhitehathacker@gmil.com</a></p>
      <p>We typically respond within 24–48 hours.</p>
    </div>
  `;
}

/* Generic detail panel for Wikipedia-based sections */
function showDetailPanel(details) {
  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← Back</button>
    <div class="detail-panel">
      <h2>${details.title}</h2>
      ${details.image ? `<img src="${details.image}" referrerpolicy="no-referrer">` : ''}
      <p>${details.extract || ''}</p>
      <p><a href="${details.url}" target="_blank" rel="noopener">Read full article on Wikipedia ↗</a></p>
    </div>
  `;
}

/* ==================== INIT ==================== */
window.addEventListener('hashchange', router);
router();