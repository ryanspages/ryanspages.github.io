// ----------------------------
// Utilities
// ----------------------------

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getColor(team, index) {
  const palette = TEAM_COLORS?.[team] || ["#666666"]; // fallback gray
  return index < palette.length ? palette[index] : OTHER_COLOR;
}

// ----------------------------
// Row Builder (Expandable)
// ----------------------------

function createRow(labelText, totalLabel, players, statLabel = "", tableColumns = []) {
  const row = document.createElement("div");
  row.className = "position-row";

  const header = document.createElement("div");
  header.className = "row-header";

  const label = document.createElement("div");
  label.className = "position-label";
  label.innerHTML = `${labelText}<br><span class="subtle">${totalLabel}</span>`;

  const bar = document.createElement("div");
  bar.className = "bar";

  // ✅ Use index in forEach
  players.forEach((p, i) => {
    const seg = document.createElement("div");
    seg.className = "segment";
    seg.style.width = `${p.percent}%`;
    seg.style.background = getColor(getParam("team"), i);
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

// ----------------------------
// Build Dashboard
// ----------------------------

async function buildDashboard() {
  const team = getParam("team");
  const year = getParam("year");

  if (!team || !year) {
    document.body.innerHTML = "<h2>Missing team or year</h2>";
    return;
  }

  const file = `data/${team}_${year}_usage.json`;

  let data;
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error("Data not found");
    data = await res.json();
  } catch (e) {
    document.body.innerHTML = `<h2>Could not load data for ${team} ${year}</h2>`;
    return;
  }

  const container = document.getElementById("usage-dashboard");
  container.innerHTML = "";

  // ----------------------------
  // Defensive Positions
  // ----------------------------

  const defenseSection = document.createElement("div");
  defenseS
