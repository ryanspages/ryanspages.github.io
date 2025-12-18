// js/usage_page.js

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getColor(team, index) {
  const palette = TEAM_COLORS?.[team] || ["#666"];
  return palette[index % palette.length];
}

/* ---------- UI helpers ---------- */

function makeToggle() {
  const btn = document.createElement("button");
  btn.textContent = "Show table";
  btn.className = "toggle-view";
  btn.dataset.mode = "bars";
  return btn;
}

function makeBars(team, label, totalLabel, players) {
  const row = document.createElement("div");
  row.className = "position-row";

  const header = document.createElement("div");
  header.className = "row-header";

  const labelEl = document.createElement("div");
  labelEl.className = "position-label";
  labelEl.innerHTML = `${label}<br><span class="subtle">${totalLabel}</span>`;

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

  header.appendChild(labelEl);
  header.appendChild(bar);
  row.appendChild(header);

  return row;
}

function makeTable(players, columns) {
  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  columns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c.label;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  players.forEach(p => {
    const tr = document.createElement("tr");
    columns.forEach(c => {
      const td = document.createElement("td");
      td.textContent = p[c.key] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

/* ---------- Section builder ---------- */

function buildSection({ team, title, rows, tableCols }) {
  const section = document.createElement("div");
  section.className = "section";

  const h2 = document.createElement("h2");
  h2.textContent = title;

  const toggle = makeToggle();
  const barsWrap = document.createElement("div");
  const tableWrap = document.createElement("div");

  tableWrap.style.display = "none";

  toggle.onclick = () => {
    const bars = toggle.dataset.mode === "bars";
    barsWrap.style.display = bars ? "none" : "block";
    tableWrap.style.display = bars ? "block" : "none";
    toggle.dataset.mode = bars ? "table" : "bars";
    toggle.textContent = bars ? "Show bars" : "Show table";
  };

  rows.forEach(r => barsWrap.appendChild(r.bar));
  tableWrap.appendChild(makeTable(
    rows.flatMap(r => r.players),
    tableCols
  ));

  section.append(h2, toggle, barsWrap, tableWrap);
  return section;
}

/* ---------- Main ---------- */

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
    container.innerHTML = `<h2>Could not load data for ${team} ${year}</h2>`;
    return;
  }

  container.innerHTML = "";

  /* Defense */
  if (data.positions) {
    const rows = data.positions.map(pos => {
      const players = pos.players
        .map(p => ({ ...p, percent: p.percent }))
        .sort((a,b) => b.percent - a.percent);

      return {
        players,
        bar: makeBars(team, pos.position, `${pos.total_inn} inn`, players)
      };
    });

    container.appendChild(
      buildSection({
        team,
        title: "Defense",
        rows,
        tableCols: [
          { label: "Player", key: "name" },
          { label: "Innings", key: "usage" },
          { label: "%", key: "percent" },
          { label: "wOBA", key: "wOBA" },
          { label: "xwOBA", key: "xwOBA" }
        ]
      })
    );
  }

  /* Batting */
  if (data.batting) {
    const players = data.batting.players.map(p => ({
      ...p,
      percent: (p.PA / data.batting.total_PA) * 100
    })).sort((a,b) => b.percent - a.percent);

    container.appendChild(
      buildSection({
        team,
        title: "Batting",
        rows: [{
          players,
          bar: makeBars(team, "Batters", `${data.batting.total_PA} PA`, players)
        }],
        tableCols: [
          { label: "Player", key: "name" },
          { label: "PA", key: "PA" },
          { label: "%", key: "percent" },
          { label: "wOBA", key: "wOBA" },
          { label: "xwOBA", key: "xwOBA" }
        ]
      })
    );
  }

  /* Pitching */
  if (data.pitching?.all) {
    const players = data.pitching.all.players.map(p => ({
      ...p,
      percent: (p.IP / data.pitching.all.total_ip) * 100
    })).sort((a,b) => b.percent - a.percent);

    container.appendChild(
      buildSection({
        team,
        title: "Pitching",
        rows: [{
          players,
          bar: makeBars(team, "All Pitchers", `${data.pitching.all.total_ip} IP`, players)
        }],
        tableCols: [
          { label: "Pitcher", key: "name" },
          { label: "IP", key: "IP" },
          { label: "%", key: "percent" },
          { label: "ERA", key: "ERA" },
          { label: "FIP", key: "FIP" }
        ]
      })
    );
  }
}

buildDashboard();
