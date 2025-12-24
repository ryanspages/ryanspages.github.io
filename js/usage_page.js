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
  labelDiv.innerHTML = `${label}${total ? `<br><span class="subtle">${total}</span>` : ""}`;

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

/* ---------- TABLE WRAPPER (MOBILE FIX) ---------- */

function wrapTable(table) {
  const scroll = document.createElement("div");
  scroll.className = "table-scroll";
  scroll.appendChild(table);
  return scroll;
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

  /* ---------- TEAM HEADER ---------- */

  const titleEl = document.createElement("div");
  titleEl.className = "team-dashboard-header";
  titleEl.textContent =
    typeof TEAM_NAMES !== "undefined" && TEAM_NAMES[team]
      ? TEAM_NAMES[team]
      : team;

  container.appendChild(titleEl);

  /* ================= DEFENSE ================= */

  if (data.positions) {
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = "<h2>Position Breakdown</h2><p>Innings by position, % of team innings, wOBA, and xwOBA (DH pos % is by PA)</p>";

    const bars = document.createElement("div");
    const tableWrap = document.createElement("div");
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
        .sort((a, b) => b.percent - a.percent);

      bars.appendChild(createBarRow(team, pos.position, "", players));
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
    tableWrap.appendChild(wrapTable(table));

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
  section.innerHTML =
    "<h2>Plate Appearance Breakdown</h2>" +
    "<p>Top players accounting for ~75% of team PA. Bar length = PA share; color = wRC+.</p>";

  const bars = document.createElement("div");
  bars.className = "bar-list";

  const tableWrap = document.createElement("div");
  tableWrap.style.display = "none";

  function wrcPlusColor(wrc) {
    if (wrc == null) return "#ccc";
    if (wrc >= 140) return "#b11226";   // elite
    if (wrc >= 115) return "#e63946";   // above avg
    if (wrc >= 95)  return "#cccccc";   // average
    if (wrc >= 75)  return "#8ecae6";   // below avg
    return "#457b9d";                   // poor
  }

  // Sort by PA descending
  const sorted = [...data.batting.players].filter(p => p.PA > 0)
    .sort((a, b) => b.PA - a.PA);

  // Accumulate until 75% total PA
  const cutoff = data.batting.total_PA * 0.75;
  let cumulative = 0;
  const topPlayers = [];
  const otherPlayers = [];

  for (const p of sorted) {
    if (cumulative < cutoff) {
      topPlayers.push(p);
      cumulative += p.PA;
    } else {
      otherPlayers.push(p);
    }
  }

  // Add "Other" bucket if necessary
  if (otherPlayers.length) {
    const otherPA = otherPlayers.reduce((s, p) => s + p.PA, 0);
    const wrcPlus = otherPlayers.reduce((s, p) => s + (p["wRC+"] ?? 100) * p.PA, 0) / otherPA || null;
    topPlayers.push({ name: "Other", PA: otherPA, ["wRC+"]: wrcPlus });
  }
  
  // ---- Compute max PA for bar scaling ----
const maxPA = Math.max(...topPlayers.map(p => p.PA));

  // Build bars
topPlayers.forEach(p => {
  const row = document.createElement("div");
  row.className = "player-bar-row";

  const label = document.createElement("div");
  label.className = "player-label";
  label.textContent = p.name;

  const barWrap = document.createElement("div");
  barWrap.className = "player-bar-wrap";

  const pct = (p.PA / data.batting.total_PA) * 100;

const bar = document.createElement("div");
bar.className = "player-bar";
bar.style.width = `${(p.PA / maxPA) * 90}%`;
bar.style.background = wrcPlusColor(p["wRC+"]);
bar.title = `${p.name}\nPA: ${p.PA}\nwRC+: ${p["wRC+"]?.toFixed(0) ?? "—"}`;

// % label
const pctLabel = document.createElement("span");
pctLabel.className = "bar-pct";
pctLabel.textContent = `${pct.toFixed(1)}%`;

// Position label just outside bar end
const barWidth = (p.PA / maxPA) * 90;
pctLabel.style.left = `calc(${barWidth}% + 6px)`;

barWrap.appendChild(bar);
barWrap.appendChild(pctLabel);
  row.append(label, barWrap);
  bars.appendChild(row);
});

  // ---- Table (unchanged) ----
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Player</th><th>PA</th><th>%</th><th>wOBA</th><th>xwOBA</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.PA}</td>
          <td>${((p.PA / data.batting.total_PA) * 100).toFixed(1)}</td>
          <td>${p.wOBA ?? "—"}</td>
          <td>${p.xwOBA ?? "—"}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  makeTableSortable(table);
  tableWrap.appendChild(wrapTable(table));

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
    section.innerHTML = "<h2>Innings Pitched Breakdown</h2><p>Innings, % of team total, ERA, and FIP</p>";

    const bars = document.createElement("div");
    const tableWrap = document.createElement("div");
    tableWrap.style.display = "none";

    const players = data.pitching.all.players
      .map(p => ({
        name: p.name,
        IP: p.IP,
        percent: (p.IP / data.pitching.all.total_ip) * 100,
        ERA: p.ERA,
        FIP: p.FIP
      }))
      .sort((a, b) => b.percent - a.percent);

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
    tableWrap.appendChild(wrapTable(table));

    section.append(
      createSectionToggle(bars, tableWrap),
      bars,
      tableWrap
    );
    container.appendChild(section);
  }
}

buildDashboard();
