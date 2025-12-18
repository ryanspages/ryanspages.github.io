async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  if (!container) return;

  const resp = await fetch("data/index.json");
  const data = await resp.json();

  data.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.textContent = team;

    // Apply team colors
    if (window.TEAM_COLORS && TEAM_COLORS[team]) {
      const colors = TEAM_COLORS[team];
      card.style.backgroundColor = colors[0];       // primary color
      card.style.borderColor = colors[1] || "#000"; // secondary color
      card.style.color = colors[2] || "#fff";       // text color
    } else {
      // fallback colors
      card.style.backgroundColor = "#cccccc";
      card.style.borderColor = "#888888";
      card.style.color = "#000000";
    }

    card.onclick = () => {
      const latestYear = Math.max(...data.years);
      window.location.href = `team.html?team=${team}&year=${latestYear}`;
    };

    container.appendChild(card);
  });
}

// Ensure TEAM_COLORS is loaded before running
function waitForTeamColors(callback) {
  if (window.TEAM_COLORS) callback();
  else setTimeout(() => waitForTeamColors(callback), 50);
}

waitForTeamColors(buildTeamSelector);