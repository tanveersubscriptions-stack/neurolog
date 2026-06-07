// ─── State ───
let entries = JSON.parse(localStorage.getItem('neurolog-entries') || '[]');

// ─── Init ───
document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
updateHeroStats();

// ─── Slider live display ───
['stress','memory','focus'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    document.getElementById(id + '-out').textContent = el.value;
  });
});

// ─── Nav tabs ───
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'data') renderData();
    if (tab === 'patterns') renderPatterns();
  });
});

// ─── Save entry ───
document.getElementById('save-btn').addEventListener('click', () => {
  const date = document.getElementById('entry-date').value;
  if (!date) return;

  const entry = {
    date,
    sleep: parseFloat(document.getElementById('sleep').value) || 0,
    phone: parseFloat(document.getElementById('phone').value) || 0,
    stress: parseInt(document.getElementById('stress').value),
    memory: parseInt(document.getElementById('memory').value),
    focus: parseInt(document.getElementById('focus').value),
    notes: document.getElementById('notes').value.trim()
  };

  const idx = entries.findIndex(e => e.date === date);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('neurolog-entries', JSON.stringify(entries));

  const conf = document.getElementById('save-confirm');
  conf.classList.add('show');
  setTimeout(() => conf.classList.remove('show'), 2000);
  updateHeroStats();
});

// ─── Export CSV ───
document.getElementById('export-btn').addEventListener('click', () => {
  const header = 'Date,Sleep (hrs),Phone (hrs),Stress (1-10),Memory Recall (1-10),Focus (1-10),Notes';
  const rows = entries.map(e =>
    `${e.date},${e.sleep},${e.phone},${e.stress},${e.memory},${e.focus},"${(e.notes || '').replace(/"/g, '""')}"`
  );
  const csv = [header, ...rows].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'neurolog_data.csv';
  a.click();
});

// ─── Hero stats ───
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

function updateHeroStats() {
  document.getElementById('hs-days').textContent = entries.length;
  const sleepAvg = avg(entries.map(e => e.sleep));
  const memAvg = avg(entries.map(e => e.memory));
  document.getElementById('hs-sleep').textContent = sleepAvg !== null ? sleepAvg.toFixed(1) + ' hrs' : '—';
  document.getElementById('hs-memory').textContent = memAvg !== null ? memAvg.toFixed(1) + '/10' : '—';
}

// ─── Data Table ───
function renderData() {
  const bar = document.getElementById('metrics-bar');
  const inner = document.getElementById('data-table-inner');

  if (!entries.length) {
    bar.innerHTML = '';
    inner.innerHTML = `<div class="empty-state"><p>No entries yet.</p><span>Start logging in the Log tab.</span></div>`;
    return;
  }

  const sleepAvg = avg(entries.map(e => e.sleep));
  const phoneAvg = avg(entries.map(e => e.phone));
  const memAvg = avg(entries.map(e => e.memory));
  const focusAvg = avg(entries.map(e => e.focus));
  const stressAvg = avg(entries.map(e => e.stress));

  bar.innerHTML = `
    <div class="mcard"><div class="mcard-label">Avg sleep</div><div class="mcard-val">${sleepAvg.toFixed(1)}<span class="mcard-unit"> hrs</span></div></div>
    <div class="mcard"><div class="mcard-label">Avg phone</div><div class="mcard-val">${phoneAvg.toFixed(1)}<span class="mcard-unit"> hrs</span></div></div>
    <div class="mcard"><div class="mcard-label">Avg memory</div><div class="mcard-val">${memAvg.toFixed(1)}<span class="mcard-unit"> /10</span></div></div>
    <div class="mcard"><div class="mcard-label">Avg focus</div><div class="mcard-val">${focusAvg.toFixed(1)}<span class="mcard-unit"> /10</span></div></div>
    <div class="mcard"><div class="mcard-label">Avg stress</div><div class="mcard-val">${stressAvg.toFixed(1)}<span class="mcard-unit"> /10</span></div></div>
    <div class="mcard"><div class="mcard-label">Entries</div><div class="mcard-val">${entries.length}</div></div>
  `;

  const stressPill = v => {
    if (v >= 7) return `<span class="pill pill-high">High</span>`;
    if (v >= 4) return `<span class="pill pill-med">Mid</span>`;
    return `<span class="pill pill-low">Low</span>`;
  };

  const rows = [...entries].reverse().map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${e.sleep} hrs</td>
      <td>${e.phone} hrs</td>
      <td>${stressPill(e.stress)}</td>
      <td>${e.memory}/10</td>
      <td>${e.focus}/10</td>
      <td style="color:var(--text3);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.notes || '—'}</td>
      <td><button class="del-btn" data-date="${e.date}" title="Delete">×</button></td>
    </tr>
  `).join('');

  inner.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Sleep</th><th>Phone</th><th>Stress</th><th>Memory</th><th>Focus</th><th>Notes</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  inner.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      entries = entries.filter(e => e.date !== btn.dataset.date);
      localStorage.setItem('neurolog-entries', JSON.stringify(entries));
      updateHeroStats();
      renderData();
    });
  });
}

// ─── Charts ───
let trendChart, scatter1Chart, scatter2Chart;

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a24',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#f0ede8',
      bodyColor: '#a09a90',
      titleFont: { family: 'DM Mono', size: 12 },
      bodyFont: { family: 'DM Mono', size: 12 }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#5a5550', font: { family: 'DM Mono', size: 11 } }
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#5a5550', font: { family: 'DM Mono', size: 11 } }
    }
  }
};

function renderPatterns() {
  const insightsEl = document.getElementById('auto-insights');
  if (entries.length < 3) {
    insightsEl.innerHTML = `<div class="insight-card">Log at least 3 entries to unlock pattern charts and auto insights.</div>`;
    if (trendChart) { trendChart.destroy(); trendChart = null; }
    if (scatter1Chart) { scatter1Chart.destroy(); scatter1Chart = null; }
    if (scatter2Chart) { scatter2Chart.destroy(); scatter2Chart = null; }
    return;
  }

  const labels = entries.map(e => e.date.slice(5));

  // Trend chart
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trend-chart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Sleep', data: entries.map(e => e.sleep), borderColor: '#7fc8f0', backgroundColor: 'rgba(127,200,240,0.07)', tension: 0.35, pointRadius: 3, borderWidth: 2 },
        { label: 'Memory', data: entries.map(e => e.memory), borderColor: '#c8f0a0', backgroundColor: 'rgba(200,240,160,0.07)', tension: 0.35, pointRadius: 3, borderWidth: 2 },
        { label: 'Focus', data: entries.map(e => e.focus), borderColor: '#b87cf0', backgroundColor: 'rgba(184,124,240,0.07)', tension: 0.35, pointRadius: 3, borderWidth: 2 },
        { label: 'Phone', data: entries.map(e => e.phone), borderColor: '#f0b86e', backgroundColor: 'rgba(240,184,110,0.07)', tension: 0.35, pointRadius: 3, borderWidth: 2, borderDash: [5,4] },
        { label: 'Stress', data: entries.map(e => e.stress), borderColor: '#e87070', backgroundColor: 'rgba(232,112,112,0.07)', tension: 0.35, pointRadius: 3, borderWidth: 2, borderDash: [5,4] },
      ]
    },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }
  });

  // Build legend manually
  const legendData = [
    { label: 'Sleep', color: '#7fc8f0' },
    { label: 'Memory', color: '#c8f0a0' },
    { label: 'Focus', color: '#b87cf0' },
    { label: 'Phone', color: '#f0b86e' },
    { label: 'Stress', color: '#e87070' },
  ];
  document.getElementById('trend-legend').innerHTML = legendData.map(d =>
    `<div class="leg-item"><div class="leg-dot" style="background:${d.color}"></div>${d.label}</div>`
  ).join('');

  // Scatter: sleep vs memory
  if (scatter1Chart) scatter1Chart.destroy();
  scatter1Chart = new Chart(document.getElementById('scatter-chart').getContext('2d'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Sleep vs Memory',
        data: entries.map(e => ({ x: e.sleep, y: e.memory })),
        backgroundColor: 'rgba(127,200,240,0.6)',
        pointRadius: 7,
        pointHoverRadius: 9
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ...chartDefaults.scales.x, title: { display: true, text: 'Sleep (hrs)', color: '#5a5550', font: { family: 'DM Mono', size: 11 } } },
        y: { ...chartDefaults.scales.y, min: 0, max: 10, title: { display: true, text: 'Memory recall', color: '#5a5550', font: { family: 'DM Mono', size: 11 } } }
      }
    }
  });

  // Scatter: phone vs focus
  if (scatter2Chart) scatter2Chart.destroy();
  scatter2Chart = new Chart(document.getElementById('scatter2-chart').getContext('2d'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Phone vs Focus',
        data: entries.map(e => ({ x: e.phone, y: e.focus })),
        backgroundColor: 'rgba(240,184,110,0.6)',
        pointRadius: 7,
        pointHoverRadius: 9
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ...chartDefaults.scales.x, title: { display: true, text: 'Phone use (hrs)', color: '#5a5550', font: { family: 'DM Mono', size: 11 } } },
        y: { ...chartDefaults.scales.y, min: 0, max: 10, title: { display: true, text: 'Focus', color: '#5a5550', font: { family: 'DM Mono', size: 11 } } }
      }
    }
  });

  // Auto insights
  const sleepA = avg(entries.map(e => e.sleep));
  const phoneA = avg(entries.map(e => e.phone));
  const stressA = avg(entries.map(e => e.stress));
  const memA = avg(entries.map(e => e.memory));
  const focusA = avg(entries.map(e => e.focus));

  const insights = [];

  if (sleepA < 7) insights.push(`Your average sleep of <strong>${sleepA.toFixed(1)} hrs</strong> falls below the 7-hr threshold associated with optimal hippocampal memory consolidation (Walker, 2017).`);
  else insights.push(`Your average sleep of <strong>${sleepA.toFixed(1)} hrs</strong> meets the 7+ hr threshold associated with strong memory consolidation — consistent with hippocampal research.`);

  if (phoneA > 4) insights.push(`Average phone use of <strong>${phoneA.toFixed(1)} hrs/day</strong> exceeds the 4-hr threshold linked to reduced sustained attention in Ward et al. (2017).`);
  else insights.push(`Phone use averaging <strong>${phoneA.toFixed(1)} hrs/day</strong> is within the range associated with maintained attention capacity — worth tracking week-to-week.`);

  if (stressA > 6) insights.push(`Elevated average stress (<strong>${stressA.toFixed(1)}/10</strong>) is consistent with cortisol-driven PFC suppression, which may explain any focus dips you observe (Arnsten, 2015).`);

  if (memA >= 7 && sleepA >= 7) insights.push(`Strong alignment: high sleep and memory scores both averaging above 7 — your data supports the sleep-memory consolidation hypothesis.`);

  insightsEl.innerHTML = insights.map(i => `<div class="insight-card">${i}</div>`).join('');
}
