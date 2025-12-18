async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  if (!container) return;

  const resp = await fetch("data/index.json");
  const data = await resp.json();

  data.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.textContent = team;

    // Apply team colors (use first color as primary background, second color for text)
    if (window.TEAM_COLORS && TEAM_COLORS[team]) {
      const [bgColor, textColor] = TEAM_COLORS[team];
      card.style.backgroundColor = bgColor;
      card.style.color = textColor || "#ffffff";
    }

    card.onclick = () => {
      const latestYear = Math.max(...data.years);
      window.location.href = `team.html?team=${team}&year=${latestYear}`;
    };

    container.appendChild(card);
  });
}

buildTeamSelector();
