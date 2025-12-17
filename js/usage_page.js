// usage_page.js

// Utility: get URL params
function getQueryParam(name, defaultValue) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || defaultValue;
}

const team = getQueryParam('team', 'Mariners');
const year = getQueryParam('year', '2024');
const dashboard = document.getElementById('usage-dashboard');

// Toggle state: 'defense' or 'PA'
let currentMetric = 'defense';

function createToggle() {
    const container = document.createElement('div');
    container.className = 'controls';

    const btnDefense = document.createElement('div');
    btnDefense.className = 'toggle active';
    btnDefense.textContent = 'Defensive Innings';
    btnDefense.onclick = () => { currentMetric='defense'; renderTeam(currentTeamData); updateToggle(btnDefense, btnPA); };

    const btnPA = document.createElement('div');
    btnPA.className = 'toggle';
    btnPA.textContent = 'Plate Appearances';
    btnPA.onclick = () => { currentMetric='PA'; renderTeam(currentTeamData); updateToggle(btnDefense, btnPA); };

    container.appendChild(btnDefense);
    container.appendChild(btnPA);
    dashboard.appendChild(container);
}

function updateToggle(btnDefense, btnPA){
    if(currentMetric==='defense'){
        btnDefense.classList.add('active');
        btnPA.classList.remove('active');
    } else {
        btnDefense.classList.remove('active');
        btnPA.classList.add('active');
    }
}

let currentTeamData = null;

fetch('/data/team_usage.json')
  .then(res => res.json())
  .then(data => {
      if(!data[year] || !data[year][team]){
          dashboard.innerHTML = `<p>Data not available for ${team} ${year}</p>`;
          return;
      }
      currentTeamData = data[year][team];

      // create toggle controls
      createToggle();

      // render the team dashboard
      renderTeam(currentTeamData);
  });

function renderTeam(teamData){
    // clear old content (except toggle)
    const controls = dashboard.querySelector('.controls');
    dashboard.innerHTML = '';
    if(controls) dashboard.appendChild(controls);

    // Render positions
    const posSection = document.createElement('div');
    posSection.className = 'section';
    const h2pos = document.createElement('h2');
    h2pos.textContent = 'Position Player Usage & Production';
    posSection.appendChild(h2pos);

    teamData.positions.forEach(pos => {
        const row = createPositionRow(pos);
        posSection.appendChild(row);
    });

    dashboard.appendChild(posSection);

    // Render pitching
    const pitchSection = document.createElement('div');
    pitchSection.className = 'section';
    const h2pitch = document.createElement('h2');
    h2pitch.textContent = 'Pitching Usage & Production';
    pitchSection.appendChild(h2pitch);

    teamData.pitchers.forEach(pitch => {
        const row = createPitchRow(pitch);
        pitchSection.appendChild(row);
    });

    dashboard.appendChild(pitchSection);
}

function createPositionRow(pos){
    const row = document.createElement('div');
    row.className = 'position-row';

    const header = document.createElement('div');
    header.className = 'row-header';

    const label = document.createElement('div');
    label.className = 'position-label';
    label.innerHTML = `${pos.position}`;

    const barContainer = document.createElement('div');
    barContainer.className = 'bar';
    // stack segments proportional to player percent
    pos.players.forEach(p => {
        const seg = document.createElement('div');
        seg.className = 'segment';
        seg.style.width = p.percent + '%';
        seg.style.background = randomColor(p.name); // simple color by name
        barContainer.appendChild(seg);
    });

    const stats = document.createElement('div');
    stats.className = 'stats';
    stats.textContent = `wOBA ${pos.team_metric}`;

    header.appendChild(label);
    header.appendChild(barContainer);
    header.appendChild(stats);

    row.appendChild(header);

    // create player detail table (hidden)
    const details = document.createElement('div');
    details.className = 'details';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Player</th><th>Usage</th><th>%</th><th>wOBA</th><th>xwOBA</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    pos.players.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.name}</td><td>${p.usage}</td><td>${p.percent}</td><td>${p.wOBA}</td><td>${p.xwOBA}</td>`;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    details.appendChild(table);
    row.appendChild(details);

    // click header to toggle details
    header.onclick = () => {
        row.classList.toggle('expanded');
    };

    return row;
}

function createPitchRow(pitch){
    const row = document.createElement('div');
    row.className = 'position-row';

    const header = document.createElement('div');
    header.className = 'row-header';

    const label = document.createElement('div');
    label.className = 'position-label';
    label.innerHTML = pitch.role;

    const barContainer = document.createElement('div');
    barContainer.className = 'bar';
    pitch.pitchers.forEach(p => {
        const seg = document.createElement('div');
        seg.className = 'segment';
        seg.style.width = p.percent + '%';
        seg.style.background = randomColor(p.name);
        barContainer.appendChild(seg);
    });

    const stats = document.createElement('div');
    stats.className = 'stats';
    stats.textContent = `ERA ${pitch.team_metric}`;

    header.appendChild(label);
    header.appendChild(barContainer);
    header.appendChild(stats);

    row.appendChild(header);

    const details = document.createElement('div');
    details.className = 'details';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Player</th><th>IP</th><th>%</th><th>ERA</th><th>xERA</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    pitch.pitchers.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.name}</td><td>${p.IP}</td><td>${p.percent}</td><td>${p.ERA}</td><td>${p.xERA}</td>`;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    details.appendChild(table);
    row.appendChild(details);

    header.onclick = () => {
        row.classList.toggle('expanded');
    };

    return row;
}

// simple color generator for segment bars (can replace with palette)
function randomColor(str){
    let hash=0;
    for(let i=0;i<str.length;i++){hash=str.charCodeAt(i)+((hash<<5)-hash);}
    let c=(hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0,6-c.length) + c;
}
