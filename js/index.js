async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  const resp = await fetch("data/index.json");
  const data = await resp.json();

  data.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.textContent = team;

    card.onclick = () => {
      // Default to latest year
      const latestYear = Math.max(...data.years);
      window.location.href = `team.html?team=${team}&year=${latestYear}`;
    };

    container.appendChild(card);
  });
}

buildTeamSelector();
