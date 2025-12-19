// js/usage_page.js

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getColor(team, index) {
  const palette = TEAM_COLORS?.[team] || ["#666"];
  return palette[index % palette.length];
}

/* ---------- SORTABLE TABLE ---------- */

function makeTableSortable(table) {
  const ths = table.querySelectorAll("th");
  ths.forEach((th, i) => {
    let asc = true;
    th.onclick = () => {
      const rows = Array.from(table.tBodies[0].rows);
      rows.sort((a, b) => {
        const A = a.cells[i].innerText;
        const B = b.cells[i].innerText;
        const nA = parseFloat(A);
        const nB = parseFloat(B);
        if (!isNaN(nA) && !isNaN(nB)) return asc ? nA - nB : nB - nA;
        return asc ? A.localeCompare(B) : B.localeCompare(A);
      });
      asc = !asc;
      rows.forEach(r => table.tBodies[0].appendChild(r));
    };
  });
}

/* ---------- BAR ROW ---------- */

function createBarRow(team, label, total, players) {
  const row = document.createElement("div");
  row.className = "position-row";

  const header = document.createElement("div");
  header.className = "row-header";

  const labelDiv = document.createElement("div");
  labelDiv.className = "position-label";
  labelDiv.innerHTML = `${label}<br><span class="subtle">${total}</span>`;

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

  header.append(labelDiv, bar);
  row.appendChild(header);
  return row;
}

/* ---------- SECTION TOGGLE ---------- */

function createSectionToggle(barsEl, tableEl) {
  const btn = document.createElement("button");
  btn.className = "view-toggle";
  btn.textContent = "Show table";

  btn.onclick = () => {
    const barsVisible = barsEl.style.display !== "none";
    barsEl.style.display = barsVisible ? "none" : "block";
    tableEl.style.display = barsVisible ? "block" : "none";
    btn.textContent = barsVisible ? "Show bars" : "Show table";
  };

  return btn;
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
    // ---------- TEAM HEADER ----------
  const titleEl = document.createElement("div");
  titleEl.className = "team-dashboard-header";
  titleEl.textContent = (typeof TEAM_NAMES !== "undefined" && TEAM_NAMES[team]) 
  ? TEAM_NAMES[team] 
  : team;

container.appendChild(titleEl);

  /* ================= DEFENSE ================= */

  if (data.positions) {
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = "<h2>Position Breakdown</h2><p>By defensive innings; DH by PA</p>";

    const bars = document.createElement("div");
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    tableWrap.style.display = "none";

    const rows = [];

    data.positions.forEach(pos => {
      const players = pos.players
        .map(p => ({
          position: pos.position,
          name: p.name,
          innings: p.usage,
          percent: p.percent,
          wOBA: p.wOBA,
          xwOBA: p.xwOBA
        }))
        .sort((a,b) => b.percent - a.percent);

      bars.appendChild(
        createBarRow(team, pos.position, "", players)
      );

      rows.push(...players);
    });

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pos</th><th>Player</th><th>Inn</th><th>%</th><th>wOBA</th><th>xwOBA</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.position}</td>
            <td>${r.name}</td>
            <td>${r.innings}</td>
            <td>${r.percent.toFixed(1)}</td>
            <td>${r.wOBA}</td>
            <td>${r.xwOBA}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
    makeTableSortable(table);
    tableWrap.appendChild(table);

    section.append(
      createSectionToggle(bars, tableWrap),
      bars,
      tableWrap
    );
    container.appendChild(section);
  }
  
  /* ================= DH ================= */
  
if (data.dh) {
  const section = document.createElement("div");
  section.className = "section";
  section.innerHTML = "<h2>Designated Hitter (DH)</h2>";

  const bars = document.createElement("div");
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  tableWrap.style.display = "none";

  const players = data.dh.players
    .map(p => ({
      name: p.name,
      PA: p.PA,
      percent: p.percent,
      wOBA: p.wOBA,
      xwOBA: p.xwOBA
    }))
    .sort((a,b) => b.percent - a.percent);

  bars.appendChild(
    createBarRow(team, "DH", `${data.dh.total_PA} PA`, players)
  );

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Player</th><th>PA</th><th>%</th><th>wOBA</th><th>xwOBA</th>
      </tr>
    </thead>
    <tbody>
      ${players.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.PA}</td>
          <td>${p.percent.toFixed(1)}</td>
          <td>${p.wOBA}</td>
          <td>${p.xwOBA}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  makeTableSortable(table);
  tableWrap.appendChild(table);

  section.append(
    createSectionToggle(bars, tableWrap),
    bars,
    tableWrap
  );
  container.appendChild(section);
}

  /* ================= BATTING ================= */

  if (data.batting) {
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = "<h2>Batting</h2>";

    const bars = document.createElement("div");
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    tableWrap.style.display = "none";

    const players = data.batting.players
      .map(p => ({
        name: p.name,
        PA: p.PA,
        percent: (p.PA / data.batting.total_PA) * 100,
        wOBA: p.wOBA,
        xwOBA: p.xwOBA
      }))
      .sort((a,b) => b.percent - a.percent);

    bars.appendChild(
      createBarRow(team, "Batters", `${data.batting.total_PA} PA`, players)
    );

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Player</th><th>PA</th><th>%</th><th>wOBA</th><th>xwOBA</th>
        </tr>
      </thead>
      <tbody>
        ${players.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.PA}</td>
            <td>${p.percent.toFixed(1)}</td>
            <td>${p.wOBA}</td>
            <td>${p.xwOBA}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
    makeTableSortable(table);
    tableWrap.appendChild(table);

    section.append(
      createSectionToggle(bars, tableWrap),
      bars,
      tableWrap
    );
    container.appendChild(section);
  }

  /* ================= PITCHING ================= */

  if (data.pitching?.all) {
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = "<h2>Pitching</h2>";

    const bars = document.createElement("div");
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    tableWrap.style.display = "none";

    const players = data.pitching.all.players
      .map(p => ({
        name: p.name,
        IP: p.IP,
        percent: (p.IP / data.pitching.all.total_ip) * 100,
        ERA: p.ERA,
        FIP: p.FIP
      }))
      .sort((a,b) => b.percent - a.percent);

    bars.appendChild(
      createBarRow(team, "All Pitchers", `${data.pitching.all.total_ip} IP`, players)
    );

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pitcher</th><th>IP</th><th>%</th><th>ERA</th><th>FIP</th>
        </tr>
      </thead>
      <tbody>
        ${players.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.IP}</td>
            <td>${p.percent.toFixed(1)}</td>
            <td>${p.ERA}</td>
            <td>${p.FIP}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
    makeTableSortable(table);
    tableWrap.appendChild(table);

    section.append(
      createSectionToggle(bars, tableWrap),
      bars,
      tableWrap
    );
    container.appendChild(section);
  }
}

buildDashboard();
