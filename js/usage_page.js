// js/usage_page.js

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getColor(team, index) {
  const palette = TEAM_COLORS?.[team] || ["#666666"];
  return index < palette.length ? palette[index] : "#999999";
}

function createRow(team, labelText, totalLabel, players, statLabel = "", tableColumns = []) {
  const row = document.createElement("div");
  row.className = "position-row";

  const header = document.createElement("div");
  header.className = "row-header";

  const label = document.createElement("div");
  label.className = "position-label";
  label.innerHTML = `${labelText}<br><span class="subtle">${totalLabel}</span>`;

  const bar = document.createElement("div");
  bar.className = "bar";

  players.forEach((p, i) => {
    const seg = document.createElement("div");
    seg.className = "segment";
    seg.style.width = `${p.percent}%`;
    seg.style.background = getColor(team, i);
    seg.title = `${p.name}: ${p.percent.toFixed(1)}%`;
    bar.appendChild(seg);
  });

  const stats = document.createElement("div");
  stats.className = "stats";
  stats.innerHTML = statLabel;

  header.appendChild(label);
  header.appendChild(bar);
  header.appendChild(stats);
  row.appendChild(header);

  // DETAILS
  const details = document.createElement("div");
  details.className = "details";

  if (tableColumns.length) {
    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    tableColumns.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col.label;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    players.forEach(p => {
      const tr = document.createElement("tr");
      tableColumns.forEach(col => {
        const td = document.createElement("td");
        td.textContent = p[col.key] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    details.appendChild(table);
  }

  row.appendChild(details);

  header.onclick = () => {
    const isOpen = details.style.display === "block";
    details.style.display = isOpen ? "none" : "block";
  };

  return row;
}

async function buildDashboard() {
  const team = getParam("team");
  const year = getParam("year");

  const container = document.getElementById("usage-dashboard");
  if (!container) return;

  if (!team || !year) {
    container.innerHTML = "<h2>Missing team or year</h2>";
    return;
  }

  const file = `data/${team}_${year}_usage.json`;

  let data;
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error("Not found");
    data = await res.json();
  } catch (e) {
    container.innerHTML = `<h2>Could not load data for ${team} ${year}</h2>`;
    return;
  }

  container.innerHTML = "";

  // --- Defensive ---
  const defenseSection = document.createElement("div");
  defenseSection.className = "section";
  defenseSection.innerHTML = "<h2>Defense</h2>";

  if (data.positions) {
    data.positions.forEach(pos => {
      const players = pos.players
        .map(p => ({
          name: p.name,
          usage: p.usage,
          percent: p.percent,
          wOBA: p.wOBA,
          xwOBA: p.xwOBA
        }))
        .sort((a, b) => b.percent - a.percent);

      defenseSection.appendChild(
        createRow(team, pos.position, `${pos.total_inn} inn`, players, `wOBA ${pos.team_wOBA}`, [
          { label: "Player", key: "name" },
          { label: "Innings", key: "usage" },
          { label: "%", key: "percent" },
          { label: "wOBA", key: "wOBA" },
          { label: "xwOBA", key: "xwOBA" }
        ])
      );
    });
  } else {
    defenseSection.innerHTML += "<p>No defensive data available.</p>";
  }

  container.appendChild(defenseSection);

  // --- Batting ---
  const batSection = document.createElement("div");
  batSection.className = "section";
  batSection.innerHTML = "<h2>Batting</h2>";

  if (data.batting) {
    const batPlayers = data.batting.players
      .map(p => ({
        name: p.name,
        PA: p.PA,
        percent: (p.PA / data.batting.total_PA) * 100,
        wOBA: p.wOBA,
        xwOBA: p.xwOBA
      }))
      .sort((a, b) => b.percent - a.percent);

    batSection.appendChild(
      createRow(team, "Batters", `${data.batting.total_PA} PA`, batPlayers, "", [
        { label: "Player", key: "name" },
        { label: "PA", key: "PA" },
        { label: "%", key: "percent" },
        { label: "wOBA", key: "wOBA" },
        { label: "xwOBA", key: "xwOBA" }
      ])
    );
  } else {
    batSection.innerHTML += "<p>No batting data available.</p>";
  }

  container.appendChild(batSection);

  // --- Pitching ---
  const pitchSection = document.createElement("div");
  pitchSection.className = "section";
  pitchSection.innerHTML = "<h2>Pitching</h2>";

  if (data.pitching && data.pitching.all) {
    const allPitchers = data.pitching.all.players
      .map(p => ({
        name: p.name,
        IP: p.IP,
        percent: (p.IP / data.pitching.all.total_ip) * 100,
        ERA: p.ERA,
        FIP: p.FIP
      }))
      .sort((a, b) => b.percent - a.percent);

    pitchSection.appendChild(
      createRow(team, "All Pitchers", `${data.pitching.all.total_ip} IP`, allPitchers, "", [
        { label: "Pitcher", key: "name" },
        { label: "IP", key: "IP" },
        { label: "%", key: "percent" },
        { label: "ERA", key: "ERA" },
        { label: "FIP", key: "FIP" }
      ])
    );
  } else {
    pitchSection.innerHTML += "<p>No pitching data available.</p>";
  }

  container.appendChild(pitchSection);
}

buildDashboard();
