// js/usage_page.js

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getColor(team, index) {
  const palette = TEAM_COLORS?.[team] || ["#666666"];
  return index < palette.length ? palette[index] : "#999999";
}

/* ---------- TOGGLE ---------- */

function createViewToggle(onToggle) {
  const toggle = document.createElement("button");
  toggle.className = "view-toggle";
  toggle.textContent = "Show table";

  let mode = "bars";

  toggle.onclick = () => {
    mode = mode === "bars" ? "table" : "bars";
    toggle.textContent = mode === "bars" ? "Show table" : "Show bars";
    onToggle(mode);
  };

  return toggle;
}

/* ---------- ROW ---------- */

function createRow(team, labelText, totalLabel, players, statLabel, tableColumns) {
  const row = document.createElement("div");
  row.className = "position-row";

  /* Header */
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
  stats.textContent = statLabel || "";

  header.append(label, bar, stats);

  /* Table */
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  tableWrap.style.display = "none";

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
  tableWrap.appendChild(table);

  /* Toggle */
  const toggle = createViewToggle(mode => {
    bar.style.display = mode === "bars" ? "flex" : "none";
    tableWrap.style.display = mode === "table" ? "block" : "none";
  });

  row.append(toggle, header, tableWrap);
  return row;
}

/* ---------- DASHBOARD ---------- */

async function buildDashboard() {
  const team = getParam("team");
  const year = getParam("year");
  const container = document.getElementById("usage-dashboard");
  if (!container) return;

  if (!team || !year) {
    container.innerHTML = "<h2>Missing team or year</h2>";
    return;
  }

  let data;
  try {
    const res = await fetch(`data/${team}_${year}_usage.json`);
    if (!res.ok) throw new Error();
    data = await res.json();
  } catch {
    container.innerHTML = `<h2>No data available for ${team} ${year}</h2>`;
    return;
  }

  container.innerHTML = "";

  /* ---------- DEFENSE ---------- */
  if (data.positions) {
    const sec = document.createElement("div");
    sec.className = "section";
    sec.innerHTML = "<h2>Defense</h2>";

    data.positions.forEach(pos => {
      const players = pos.players.map(p => ({
        position: pos.position,
        name: p.name,
        usage: p.usage,
        percent: p.percent,
        wOBA: p.wOBA,
        xwOBA: p.xwOBA
      })).sort((a,b) => b.percent - a.percent);

      sec.appendChild(
        createRow(
          team,
          pos.position,
          `${pos.total_inn} inn`,
          players,
          `wOBA ${pos.team_wOBA}`,
          [
            { label: "Pos", key: "position" },
            { label: "Player", key: "name" },
            { label: "Inn", key: "usage" },
            { label: "%", key: "percent" },
            { label: "wOBA", key: "wOBA" },
            { label: "xwOBA", key: "xwOBA" }
          ]
        )
      );
    });

    container.appendChild(sec);
  }

  /* ---------- BATTING ---------- */
  if (data.batting) {
    const sec = document.createElement("div");
    sec.className = "section";
    sec.innerHTML = "<h2>Batting</h2>";

    const players = data.batting.players.map(p => ({
      name: p.name,
      PA: p.PA,
      percent: (p.PA / data.batting.total_PA) * 100,
      wOBA: p.wOBA,
      xwOBA: p.xwOBA
    })).sort((a,b) => b.percent - a.percent);

    sec.appendChild(
      createRow(
        team,
        "Batters",
        `${data.batting.total_PA} PA`,
        players,
        "",
        [
          { label: "Player", key: "name" },
          { label: "PA", key: "PA" },
          { label: "%", key: "percent" },
          { label: "wOBA", key: "wOBA" },
          { label: "xwOBA", key: "xwOBA" }
        ]
      )
    );

    container.appendChild(sec);
  }

  /* ---------- PITCHING ---------- */
  if (data.pitching?.all) {
    const sec = document.createElement("div");
    sec.className = "section";
    sec.innerHTML = "<h2>Pitching</h2>";

    const players = data.pitching.all.players.map(p => ({
      name: p.name,
      IP: p.IP,
      percent: (p.IP / data.pitching.all.total_ip) * 100,
      ERA: p.ERA,
      FIP: p.FIP
    })).sort((a,b) => b.percent - a.percent);

    sec.appendChild(
      createRow(
        team,
        "All Pitchers",
        `${data.pitching.all.total_ip} IP`,
        players,
        "",
        [
          { label: "Pitcher", key: "name" },
          { label: "IP", key: "IP" },
          { label: "%", key: "percent" },
          { label: "ERA", key: "ERA" },
          { label: "FIP", key: "FIP" }
        ]
      )
    );

    container.appendChild(sec);
  }
}

buildDashboard();
