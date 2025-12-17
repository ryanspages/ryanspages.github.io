// Deterministic color per player
function getColor(name) {
  const colors = ["#4c72b0","#55a868","#c44e52","#8172b3","#ccb974","#64b5cd","#f0a3ff","#ffb976"];
  let hash = 0;
  for (let i=0;i<name.length;i++) hash = name.charCodeAt(i)+((hash<<5)-hash);
  return colors[Math.abs(hash) % colors.length];
}

// Create a single row
function createRow(labelText, totalLabel, players, metricLabel="") {
  const row = document.createElement("div");
  row.className = "position-row";

  const header = document.createElement("div");
  header.className = "row-header";

  const label = document.createElement("div");
  label.className = "position-label";
  label.innerHTML = `${labelText}<br><span class="subtle">${totalLabel}</span>`;

  const barContainer = document.createElement("div");
  barContainer.className = "bar";

  players.forEach(p => {
    const seg = document.createElement("div");
    seg.className = "segment";
    seg.style.width = p.percent + "%";
    seg.style.background = getColor(p.name);
    barContainer.appendChild(seg);
  });

  const stats = document.createElement("div");
  stats.className = "stats";
  stats.innerHTML = metricLabel;

  header.appendChild(label);
  header.appendChild(barContainer);
  header.appendChild(stats);

  row.appendChild(header);
  return row;
}

// -----------------------------
// Main function to build dashboard
// -----------------------------
async function buildDashboard() {
  const container = document.getElementById("usage-dashboard");
  container.innerHTML = "";

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const team = params.get("team");

  // Fetch index.json to get available years
  const indexResp = await fetch("data/index.json");
  const indexData = await indexResp.json();

  // Determine year: default to latest if not in URL
  let year = parseInt(params.get("year"));
  if (!year || !indexData.years.includes(year)) {
    year = Math.max(...indexData.years);
  }

  // Build year selector
  const yearSelector = document.createElement("select");
  yearSelector.id = "year-selector";
  indexData.years.forEach(y => {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    if (y === year) option.selected = true;
    yearSelector.appendChild(option);
  });
  yearSelector.onchange = () => {
    const newYear = yearSelector.value;
    window.location.href = `team.html?team=${team}&year=${newYear}`;
  };
  container.appendChild(yearSelector);

  // Fetch team/year JSON
  const resp = await fetch(`data/${team}_${year}_usage.json`);
  const data = await resp.json();

  // -----------------------------
  // Position Players
  // -----------------------------
  const posSection = document.createElement("div");
  posSection.className = "section";
  posSection.innerHTML = `<h2>Position Player Usage & Production</h2><div class="subtle">Click a bar for player breakdown.</div>`;
  data.positions.forEach(pos => {
    const players = pos.players.map(p => ({name: p.name, percent: p.usage/pos.total_inn*100}));
    const metric = `wOBA ${pos.team_wOBA}`;
    posSection.appendChild(createRow(pos.position, pos.total_inn+" inn", players, metric));
  });
  container.appendChild(posSection);

  // -----------------------------
  // Batting
  // -----------------------------
  const batSection = document.createElement("div");
  batSection.className = "section";
  batSection.innerHTML = `<h2>Batting Usage & Production</h2><div class="subtle">Bar length shows plate appearances</div>`;
  const batPlayers = data.batting.players
  .map(p => ({name: p.name, percent: p.PA / data.batting.total_PA * 100}))
  .sort((a, b) => b.percent - a.percent);
  batSection.appendChild(createRow("Batters", data.batting.total_PA+" PA", batPlayers));
  container.appendChild(batSection);

  // -----------------------------
  // Pitching — All IP
  // -----------------------------
  const pitchSection = document.createElement("div");
  pitchSection.className = "section";
  pitchSection.innerHTML = `<h2>Pitching Usage & Production</h2><div class="subtle">Bar length shows share of team innings pitched</div>`;
  const allPlayers = data.pitching.all.players
  .map(p => ({name: p.name, percent: p.IP / data.pitching.all.total_ip * 100}))
  .sort((a, b) => b.percent - a.percent);
  pitchSection.appendChild(createRow("All Pitchers", data.pitching.all.total_ip+" IP", allPlayers));
  const rpPlayers = data.pitching.relief_only.players
  .map(p => ({name: p.name, percent: p.IP / data.pitching.relief_only.total_ip * 100}))
  .sort((a, b) => b.percent - a.percent);
  pitchSection.appendChild(createRow("Relief Only", data.pitching.relief_only.total_ip+" IP", rpPlayers));
  container.appendChild(pitchSection);
}

// -----------------------------
// Run
// -----------------------------
buildDashboard();
