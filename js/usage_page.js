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
    details.style.display = details.style.display === "block" ? "none" : "block";
  };

  return row;
}

async function buildDashboard() {
  const team = getParam("team");
  const year = getParam("year");
  const container = document.getElementById("usage-dashboard");

  if (!container) return;

  // Set page title
  const pageTitleEl = document.querySelector("#page-title");
  if (pageTitleEl) {
    pageTitleEl.textContent = TEAM_NAMES?.[team] || team;
  }

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

  // Sections
  const sections = [
    { title: "Defense", items: data.positions, isPlayers: true },
    { title: "Batting", items: data.batting?.players, total: data.batting?.total_PA },
    { title: "Pitching", items: data.pitching?.all?.players, total: data.pitching?.all?.total_ip }
  ];

  // Build each section
  sections.forEach(sec => {
    const secDiv = document.createElement("div");
    secDiv.className = "section";
    secDiv.innerHTML = `<h2>${sec.title}</h2>`;

    if (!sec.items || sec.items.length === 0) {
      secDiv.innerHTML += `<p>No ${sec.title.toLowerCase()} data available.</p>`;
    } else {
      if (sec.title === "Defense") {
        sec.items.forEach(pos => {
          const players = pos.players.map(p => ({
            name: p.name,
            usage: p.usage,
            percent: p.percent,
            wOBA: p.wOBA,
            xwOBA: p.xwOBA
          })).sort((a,b) => b.percent - a.percent);

          secDiv.appendChild(
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
        const players = sec.items.map(p => {
          if (sec.title === "Batting") {
            return {
              name: p.name,
              PA: p.PA,
              percent: (p.PA / sec.total) * 100,
              wOBA: p.wOBA,
              xwOBA: p.xwOBA
            };
          } else {
            return {
              name: p.name,
              IP: p.IP,
              percent: (p.IP / sec.total) * 100,
              ERA: p.ERA,
              FIP: p.FIP
            };
          }
        }).sort((a,b) => b.percent - a.percent);

        secDiv.appendChild(
          createRow(team, sec.title === "Batting" ? "Batters" : "All Pitchers",
            sec.total + (sec.title === "Batting" ? " PA" : " IP"), players,
            "", sec.title === "Batting"
            ? [
              { label: "Player", key: "name" },
              { label: "PA", key: "PA" },
              { label: "%", key: "percent" },
              { label: "wOBA", key: "wOBA" },
              { label: "xwOBA", key: "xwOBA" }
            ]
            : [
              { label: "Pitcher", key: "name" },
              { label: "IP", key: "IP" },
              { label: "%", key: "percent" },
              { label: "ERA", key: "ERA" },
              { label: "FIP", key: "FIP" }
            ]
          )
        );
      }
    }

    container.appendChild(secDiv);
  });
}

buildDashboard();
