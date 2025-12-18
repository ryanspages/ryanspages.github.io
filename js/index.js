async function buildUsagePage() {
  const params = new URLSearchParams(window.location.search);
  const team = params.get("team");
  const year = params.get("year");

  if (!team || !year) {
    document.body.innerHTML = "<p>Missing team or year</p>";
    return;
  }

  // Page title
  const titleEl = document.querySelector("#page-title");
  if (titleEl) {
    titleEl.textContent = `${team} – ${year}`;
  }

  const dataPath = `data/${team}_${year}_usage.json`;

  let data;
  try {
    const resp = await fetch(dataPath);
    if (!resp.ok) throw new Error("Data not found");
    data = await resp.json();
  } catch (err) {
    document.body.innerHTML = `<p>Could not load data for ${team} ${year}</p>`;
    return;
  }

  const colors = TEAM_COLORS?.[team] || ["#777"];

  buildSection("Batting Usage", data.batting, "batting", colors);
  buildSection("Pitching Usage", data.pitching, "pitching", colors);
  buildSection("Defensive Usage", data.defense, "defense", colors);
}

/* ---------- Section Builder ---------- */

function buildSection(title, sectionData, sectionId, colors) {
  if (!sectionData || sectionData.length === 0) return;

  const container = document.querySelector(`#${sectionId}`);
  if (!container) return;

  container.innerHTML = "";

  const header = document.createElement("h2");
  header.textContent = title;
  container.appendChild(header);

  sectionData.forEach(group => {
    const wrapper = document.createElement("div");
    wrapper.className = "usage-group";

    const label = document.createElement("div");
    label.className = "group-label";
    label.textContent = group.label;
    wrapper.appendChild(label);

    const bar = document.createElement("div");
    bar.className = "usage-bar";

    // Sort largest → smallest
    const players = [...group.players].sort((a, b) => b.value - a.value);

    players.forEach((p, i) => {
      const seg = document.createElement("div");
      seg.className = "usage-segment";
      seg.style.width = `${p.percent}%`;
      seg.style.background = colors[i % colors.length];
      seg.title = `${p.name}: ${p.value}`;

      bar.appendChild(seg);
    });

    wrapper.appendChild(bar);

    /* ---------- Expandable Details ---------- */

    const details = document.createElement("div");
    details.className = "details hidden";

    players.forEach(p => {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.textContent = `${p.name}: ${p.value}`;
      details.appendChild(row);
    });

    wrapper.appendChild(details);

    // Toggle expand on click
    wrapper.onclick = () => {
      details.classList.toggle("hidden");
    };

    container.appendChild(wrapper);
  });
}

buildUsagePage();
