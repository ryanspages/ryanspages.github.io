// Fetch index.json and populate team/year selector
async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  const resp = await fetch("data/index.json");
  const data = await resp.json();

  // If JSON is {TEAM: [YEAR]}
  for (const [team, years] of Object.entries(data)) {
    years.forEach(year => {
      const card = document.createElement("div");
      card.className = "team-card";
      card.textContent = `${team} — ${year}`;
      card.onclick = () => {
        window.location.href = `team.html?team=${team}&year=${year}`;
      };
      container.appendChild(card);
    });
  }
}

buildTeamSelector();
