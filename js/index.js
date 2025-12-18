// js/index.js

async function buildTeamSelector() {
  const container = document.querySelector("#team-selector");
  if (!container) return;

  // Load index data
  const resp = await fetch("data/index.json");
  const data = await resp.json();

  data.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.textContent = team;

    // Apply team colors
    if (window.TEAM_COLORS && TEAM_COLORS[team]) {
      const colors = TEAM_COLORS[team];
      card.style.backgroundColor = colors[0];   // primary color
      card.style.color = "#ffffff";             // text color for readability
      card.style.border = `2px solid ${colors[1] || "#000"}`; // secondary color border
    } else {
      // Fallback for teams without a defined palette
      card.style.backgroundColor = "#666666";
      card.style.color = "#ffffff";
      card.style.border = "2px solid #444";
    }

    // Navigate to team page on click
    card.onclick = () => {
      const latestYear = Math.max(...data.years);
      window.location.href = `team.html?team=${team}&year=${latestYear}`;
    };

    container.appendChild(card);
  });
}

// Initialize
buildTeamSelector();
