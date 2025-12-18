// index.js
const container = document.querySelector("#team-selector");

fetch("data/index.json")
  .then(resp => resp.json())
  .then(data => {
    data.teams.forEach(team => {
      const card = document.createElement("div");
      card.className = "team-card";
      card.textContent = team;

      // Apply team colors
      if (TEAM_COLORS && TEAM_COLORS[team]) {
        const colors = TEAM_COLORS[team];
        card.style.backgroundColor = colors[0];  // primary
        card.style.borderColor = colors[1] || "#000"; // secondary
        card.style.color = colors[2] || "#fff"; // text
      } else {
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
  })
  .catch(err => console.error("Could not load teams:", err));
