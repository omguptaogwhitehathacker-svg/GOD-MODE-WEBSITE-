const artwork = "cherry-blossom.jfif";

const data = {
  search: [
    [
      "Knowledge",
      "Cognitive science",
      "How minds make models, decisions, and mistakes — a useful place to start.",
      "WIKIPEDIA · 12 MIN READ",
    ],
    [
      "Knowledge",
      "Signal processing",
      "A field guide to turning noisy measurements into something you can act on.",
      "WIKIPEDIA · 18 MIN READ",
    ],
    [
      "GitHub",
      "tinygrad / tinygrad",
      "A small, readable neural network framework for understanding the machinery underneath.",
      "GITHUB · 25.4K STARS",
    ],
    [
      "Hardware",
      "ESP32-S3",
      "A low-cost Wi-Fi and Bluetooth microcontroller with room for experiments.",
      "BOARD · DUAL-CORE",
    ],
    [
      "Vehicles",
      "DeLorean DMC-12",
      "A stainless steel wedge, a design artifact, and a surprisingly rich engineering story.",
      "VEHICLE · 1981—1983",
    ],
  ],
  boards: [
    [
      "S3",
      "ESP32-S3",
      "Wi-Fi, Bluetooth LE, and enough pins for a weekend of wonderfully bad ideas.",
      "MICROCONTROLLER · WIRELESS",
    ],
    [
      "P",
      "Raspberry Pi Pico 2",
      "A tidy little RP2350 board for when the machine should feel close to the metal.",
      "RP2350 · C / PYTHON",
    ],
    [
      "01",
      "Arduino Uno R4",
      "A friendly front door into sensors, motors, and the satisfying click of a first prototype.",
      "RENESAS · BEGINNER",
    ],
    [
      "N",
      "STM32 Nucleo",
      "Serious embedded tooling without losing the joy of a blinking LED.",
      "ARM CORTEX · DEBUGGER",
    ],
  ],
  vehicles: [
    [
      "D",
      "DeLorean DMC-12",
      "A gull-winged stainless steel time capsule with a troubled production run.",
      "V6 · 130 HP · 1981—1983",
    ],
    [
      "L",
      "Land Rover Defender",
      "A box with a purpose. Utility, repairability, and a silhouette that refuses to age.",
      "I4 · 296 HP · 2020—",
    ],
    [
      "M",
      "Mazda MX-5",
      "The smallest possible argument for making a car lighter instead of faster.",
      "I4 · 181 HP · 1989—",
    ],
    [
      "C",
      "Citroën DS",
      "Hydropneumatic suspension, directional headlights, and a little French audacity.",
      "I4 · 130 HP · 1955—1975",
    ],
  ],
  repos: [
    [
      "tinygrad",
      "tinygrad",
      "You like PyTorch? You like micrograd? You like tinygrad.",
      "Python",
      "25.4k",
    ],
    [
      "Swordfish90",
      "cool-retro-term",
      "A terminal emulator that looks like an old cathode ray tube display.",
      "QML",
      "9.8k",
    ],
    [
      "raspberrypi",
      "pico-sdk",
      "SDK for the Raspberry Pi Pico RP2040-based microcontroller boards.",
      "C",
      "3.6k",
    ],
    [
      "immich-app",
      "immich",
      "Self-hosted photo and video management solution.",
      "TypeScript",
      "62.1k",
    ],
  ],
  stocks: [
    ["AAPL", "Apple", "$193.89", "+1.42%"],
    ["NVDA", "NVIDIA", "$875.28", "+2.16%"],
    ["TSLA", "Tesla", "$177.48", "-0.84%"],
    ["BTC", "Bitcoin", "$68,442", "+0.56%"],
  ],
};

const app = document.querySelector("#app");
const labels = {
  home: "God Search",
  boards: "Dev Boards",
  github: "GitHub",
  hackclub: "Hack Club",
  vehicles: "Vehicles",
  markets: "Markets",
  forge: "Project Forge",
  support: "Support",
};
let savedIdea = false;
let ideaNumber = 0;

function shell(title, body) {
  document.querySelector("#pageLabel").textContent = title;
  app.innerHTML = `<div class="content-wrap reveal">${body}</div>`;
  document
    .querySelectorAll(".rail-link")
    .forEach((link) =>
      link.classList.toggle(
        "active",
        link.dataset.route === location.hash.slice(1) ||
          (location.hash === "" && link.dataset.route === "home"),
      ),
    );
  document.querySelector("#sideRail").classList.remove("open");
}

function searchBar(label = "Search") {
  return `<form class="search-strip" id="searchForm"><div class="search-input-wrap"><span>⌕</span><input class="search-input" id="searchInput" placeholder="Try a topic, a repo, a board…" aria-label="Search"></div><button class="search-submit">${label}</button></form>`;
}

function home() {
  shell(
    "God Search",
    `<section class="home-hero" style="background-image:url('${artwork}')"><div class="hero-copy"><div class="eyebrow">A quiet instrument for loud ideas</div><h1>Follow the<br><em>interesting</em> thing.</h1><p class="lede">God Mode is a personal command center for curious builders. Search the web’s knowledge, browse code, study machines, and leave with a project worth making.</p><button class="button-primary" id="beginSearch">Open the search desk <span>→</span></button></div><div class="hero-index"><strong>FIELD NOTE / 001</strong>Make the first move small enough to make now. The rest of the map appears after.</div></section><section id="searchDesk"><div class="page-heading"><div><div class="eyebrow">God Search</div><h2>One desk.<br>Several rabbit holes.</h2></div><p class="heading-meta">A forgiving search across local starting points. No accounts, no ceremony, no need to know exactly what you are looking for.</p></div>${searchBar()}<div id="results" class="result-grid"></div></section>`,
  );
  document.querySelector("#results").innerHTML =
    '<div class="state-box"><h3>Start with a loose thread.</h3><p>Search across knowledge, hardware, code, and the occasional beautiful machine.</p></div>';
  document.querySelector("#beginSearch").onclick = () => {
    document
      .querySelector("#searchDesk")
      .scrollIntoView({ behavior: "smooth" });
    document.querySelector("#searchInput").focus();
  };
  document.querySelector("#searchForm").onsubmit = (event) => {
    event.preventDefault();
    const query = document
      .querySelector("#searchInput")
      .value.toLowerCase()
      .trim();
    const found = data.search.filter((item) =>
      item.join(" ").toLowerCase().includes(query),
    );
    document.querySelector("#results").innerHTML = found.length
      ? found
          .map(
            (item, i) =>
              `<article class="result-card reveal"><div class="result-top"><span>${item[0]}</span><span>0${i + 1}</span></div><h3>${item[1]}</h3><p>${item[2]}</p><div class="result-foot"><span>${item[3]}</span><span>↗</span></div></article>`,
          )
          .join("")
      : '<div class="state-box"><h3>Nothing in the index yet.</h3><p>Try a broader phrase. The best rabbit holes rarely start with the perfect query.</p></div>';
  };
}

function collection(type) {
  const isBoard = type === "boards";
  const items = data[type];
  const title = isBoard ? "Dev Boards." : "Beautiful machines.";
  const kicker = isBoard ? "Hardware index" : "Machine index";
  shell(
    isBoard ? "Dev Boards" : "Vehicles",
    `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h2>${isBoard ? "Dev<br>boards." : "Beautiful<br>machines."}</h2></div><p class="heading-meta">${isBoard ? "A practical shelf of boards worth keeping within reach. Each one is a different kind of invitation." : "A small collection of vehicles with good proportions, odd solutions, or stories that got under the skin."}</p></div>${searchBar("Filter")}<div id="collection" class="board-grid">${items.map((item) => `<a class="board-card" href="#${type}/${item[0].toLowerCase()}" data-item="${item.join(" ").toLowerCase()}"><div class="board-mark">${item[0]}</div><div><h3>${item[1]}</h3><p>${item[2]}</p><span class="tag">${item[3]}</span></div></a>`).join("")}</div>`,
  );
  document.querySelector("#searchForm").onsubmit = (e) => {
    e.preventDefault();
    const query = document.querySelector("#searchInput").value.toLowerCase();
    document
      .querySelectorAll("[data-item]")
      .forEach(
        (item) =>
          (item.style.display = item.dataset.item.includes(query)
            ? ""
            : "none"),
      );
  };
}

function github() {
  shell(
    "GitHub",
    `<div class="page-heading"><div><div class="eyebrow">Code index</div><h2>Good code,<br>kept close.</h2></div><p class="heading-meta">A hand-picked local shelf of repositories that teach, surprise, or make the computer feel a little more legible.</p></div>${searchBar("Filter")}<div class="filters">${["All", "Python", "C", "TypeScript"].map((language) => `<button class="filter-chip ${language === "All" ? "selected" : ""}" data-language="${language}">${language}</button>`).join("")}</div><div id="repos" class="repo-grid">${data.repos.map((repo) => `<article class="repo-card" data-repo="${repo.join(" ").toLowerCase()}"><div class="result-top"><span>${repo[0]}</span><span>★ ${repo[4]}</span></div><h3>${repo[0]} / ${repo[1]}</h3><p>${repo[2]}</p><div class="repo-meta"><span><strong>${repo[3]}</strong></span><span>Open source</span><a href="https://github.com/${repo[0]}/${repo[1]}" target="_blank">↗</a></div></article>`).join("")}</div>`,
  );
  document.querySelectorAll("[data-language]").forEach(
    (button) =>
      (button.onclick = () => {
        document
          .querySelectorAll("[data-language]")
          .forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        const language = button.dataset.language.toLowerCase();
        document
          .querySelectorAll("[data-repo]")
          .forEach(
            (repo) =>
              (repo.style.display =
                language === "all" || repo.dataset.repo.includes(language)
                  ? ""
                  : "none"),
          );
      }),
  );
  document.querySelector("#searchForm").onsubmit = (e) => {
    e.preventDefault();
    const query = document.querySelector("#searchInput").value.toLowerCase();
    document
      .querySelectorAll("[data-repo]")
      .forEach(
        (repo) =>
          (repo.style.display = repo.dataset.repo.includes(query)
            ? ""
            : "none"),
      );
  };
}

function markets() {
  shell(
    "Markets",
    `<div class="page-heading"><div><div class="eyebrow">Market watch</div><h2>Keep one eye<br>on the weather.</h2></div><p class="heading-meta">A small, deliberately un-serious market watch. Numbers are signals, not instructions. Do your own thinking.</p></div><div class="market-grid">${data.stocks.map((stock, i) => `<button class="market-card" data-stock="${i}"><div class="market-name"><span>${stock[0]}</span><span>${stock[1]}</span></div><div class="market-price">${stock[2]}</div><div class="market-change ${stock[3][0] === "+" ? "up" : ""}">${stock[3]} today</div></button>`).join("")}</div><div class="chart-block"><div class="chart-head"><div><div class="eyebrow">Intraday sketch</div><h3 id="chartTitle">NVIDIA / NVDA</h3><p>Local mock reading · updated just now</p></div><div class="market-price up" id="chartPrice">$875.28</div></div><svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,68 12,75 26,52 39,60 51,30 65,42 80,18 100,27" fill="none" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg></div>`,
  );
  document.querySelectorAll("[data-stock]").forEach(
    (card) =>
      (card.onclick = () => {
        const stock = data.stocks[card.dataset.stock];
        document.querySelector("#chartTitle").textContent =
          `${stock[1]} / ${stock[0]}`;
        document.querySelector("#chartPrice").textContent = stock[2];
      }),
  );
}

function forge() {
  const ideas = [
    [
      "A field recorder for city noise",
      "Pair an ESP32-S3 with a cheap microphone and map the texture of a neighborhood at different hours.",
      "ESP32-S3 · AUDIO · MAPS",
    ],
    [
      "The dashboard that refuses dashboards",
      "A tiny e-ink display for one honest number: how much of your day did you spend making something?",
      "PICO 2 · E-INK · HABITS",
    ],
    [
      "Mechanical sympathy",
      "Use a phone camera and a small model to listen for the moment an old engine starts to drift.",
      "TINYGRAD · DIAGNOSTICS · CAR",
    ],
  ];
  const idea = ideas[ideaNumber];
  shell(
    "Project Forge",
    `<div class="page-heading"><div><div class="eyebrow">Project Forge</div><h2>Turn a hunch<br>into a <em>build.</em></h2></div><p class="heading-meta">A small machine for combining ingredients. Not a generator of productivity — a nudge toward something you can put on a desk.</p></div><div class="forge-layout"><section class="forge-prompt"><div class="eyebrow">Current collision</div><h3 id="ideaTitle">${idea[0]}</h3><p id="ideaDescription">${idea[1]}</p><div class="forge-controls"><button class="button-primary" id="nextIdea">✦ Find another</button><button class="button-quiet" id="saveIdea">${savedIdea ? "✓ Saved" : "♡ Keep it"}</button></div></section><section class="idea-stack"><article class="idea-card"><span class="idea-index">01 / THE BRIEF</span><h3>What would make this physical?</h3><p>Start with a constraint: one sensor, one afternoon, one person who would actually use it.</p></article><article class="idea-card"><span class="idea-index">02 / INGREDIENTS</span><h3>Borrow before you build.</h3><p id="ideaTags">${idea[2]}</p></article></section></div>`,
  );
  document.querySelector("#nextIdea").onclick = () => {
    ideaNumber = (ideaNumber + 1) % ideas.length;
    forge();
  };
  document.querySelector("#saveIdea").onclick = () => {
    savedIdea = !savedIdea;
    forge();
  };
}

function simplePage(route) {
  const copy =
    route === "hackclub"
      ? [
          "The open workshop",
          "Make things<br><em>with people.</em>",
          "Hack Club is a global network of young builders. Find events, collaborators, and people who take the weird prototype seriously.",
          "Visit hackclub.com",
        ]
      : [
          "A note from the desk",
          "Small tools<br>should feel <em>alive.</em>",
          "God Mode is a frontend-only workspace. It uses local mock data so the first experience is quick, dependable, and a little more private.",
          "Back to the desk",
        ];
  shell(
    labels[route],
    `<div class="page-heading"><div><div class="eyebrow">${copy[0]}</div><h2>${copy[1]}</h2></div><p class="heading-meta">${copy[2]}</p></div><div class="support-grid"><div class="support-card"><h3>${route === "hackclub" ? "Ship a little thing" : "How to use this place"}</h3><p>${route === "hackclub" ? "Build a website, a game, a robot, or a tool for your friends. The only useful brief is the one that gets you to the first commit." : "Search when you have a thread. Browse when you do not. Use the Forge when two unrelated tabs start making eye contact."}</p><a class="button-quiet" href="${route === "hackclub" ? "https://hackclub.com/" : "#home"}" target="${route === "hackclub" ? "_blank" : ""}">${copy[3]} →</a></div><div class="support-card"><h3>A place to show up</h3><p>Keep your curiosity close. The next useful project usually starts with an unfinished idea and a little room to explore.</p></div></div>`,
  );
}

function render() {
  const route = location.hash.slice(1).split("/")[0] || "home";
  if (route === "home") home();
  else if (route === "boards" || route === "vehicles") collection(route);
  else if (route === "github") github();
  else if (route === "markets") markets();
  else if (route === "forge") forge();
  else simplePage(route === "hackclub" ? "hackclub" : "support");
}

document
  .querySelectorAll("[data-route]")
  .forEach((link) =>
    link.addEventListener("click", () => setTimeout(render, 0)),
  );
document.querySelector("#menuButton").onclick = () =>
  document.querySelector("#sideRail").classList.toggle("open");
window.addEventListener("hashchange", render);
render();
