async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  if (!container) return;

  const resp = await fetch("data/index.json");
  const data = await resp.json();

  data.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.textContent = team;

    // Apply team color (use first color as background, second as text)
    if (window.TEAM_COLORS && TEAM_COLORS[team]) {
      card.style.backgroundColor = TEAM_COLORS[team][0]; // primary color
      card.style.color = TEAM_COLORS[team][1] || "#ffffff"; // secondary color or white
      card.style.border = `2px solid ${TEAM_COLORS[team][0]}`;
    }

    card.onclick = () => {
      const latestYear = Math.max(...data.years);
      window.location.href = `team.html?team=${team}&year=${latestYear}`;
    };

    container.appendChild(card);
  });
}

// Ensure scripts are loaded
window.addEventListener("DOMContentLoaded", () => {
  buildTeamSelector();
});