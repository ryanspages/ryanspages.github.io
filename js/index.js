// js/index.js
async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  if (!container) return;

  const resp = await fetch("data/index.json");
  const data = await resp.json();

  data.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.textContent = team;

    // Use first team color as background, text white for contrast
    if (window.TEAM_COLORS && TEAM_COLORS[team]) {
      card.style.backgroundColor = TEAM_COLORS[team][0];
      card.style.color = "#ffffff";
    } else {
      card.style.backgroundColor = "#777";
      card.style.color = "#000";
    }

    card.onclick = () => {
      const latestYear = Math.max(...data.years);
      window.location.href = `team.html?team=${team}&year=${latestYear}`;
    };

    container.appendChild(card);
  });
}

buildTeamSelector();
