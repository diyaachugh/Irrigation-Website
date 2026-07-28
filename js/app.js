/**
 * Sugarcane IAAS — Main Application
 */

(function () {
  'use strict';

  let sensors = generateSensorData();
  let alerts = generateAlerts();
  let advisoryResult = null;
  let charts = {};
  const cropDay = getDaysSincePlanting();
  const cropStage = getCurrentStage(cropDay);

  const SECTION_TITLES = {
    dashboard: ['Dashboard', 'Real-time monitoring & irrigation insights'],
    sensors: ['Sensor Network', 'IoT sensor readings across field zones'],
    advisory: ['AI Advisory', 'Machine learning irrigation recommendations'],
    fields: ['Field Zones', 'Spatial moisture mapping & zone management'],
    crop: ['Crop Stage', 'Sugarcane phenology & water requirements'],
    analytics: ['Analytics', 'Historical trends & water usage reports'],
    alerts: ['Alerts', 'System notifications & field warnings'],
  };

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupNavigation();
    setupMobileMenu();
    setupEventListeners();
    refreshDashboard();
    renderSensors();
    renderNetworkMap();
    runAIAnalysis();
    renderFieldMap();
    renderCropStages();
    renderAlerts();
    renderSchedule();
    initCharts();
    updateLastSync();
    startLiveUpdates();
  }

  /* ---- Navigation ---- */
  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.dataset.section);
      });
    });

    document.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', () => navigateTo(el.dataset.goto));
    });
  }

  function navigateTo(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(section)?.classList.add('active');
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');

    const [title, subtitle] = SECTION_TITLES[section] || ['', ''];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;

    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('visible');
  }

  function setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }

  /* ---- Event Listeners ---- */
  function setupEventListeners() {
    document.getElementById('run-ai-btn')?.addEventListener('click', () => {
      runAIAnalysis();
      showToast('AI analysis complete', 'success');
    });

    document.getElementById('recalculate-btn')?.addEventListener('click', () => {
      sensors = generateSensorData();
      runAIAnalysis();
      refreshDashboard();
      renderSensors();
      showToast('Recommendation recalculated', 'success');
    });

    document.getElementById('refresh-sensors')?.addEventListener('click', () => {
      sensors = generateSensorData();
      renderSensors();
      refreshDashboard();
      updateLastSync();
      showToast('Sensor data refreshed', 'info');
    });

    document.getElementById('sensor-zone-filter')?.addEventListener('change', e => {
      renderSensors(e.target.value);
    });

    document.getElementById('mark-read-btn')?.addEventListener('click', () => {
      alerts.forEach(a => { a.unread = false; });
      renderAlerts();
      updateAlertBadge();
      showToast('All alerts marked as read', 'info');
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAlerts(btn.dataset.filter);
      });
    });

    document.getElementById('chart-range')?.addEventListener('change', e => {
      updateMoistureChart(parseInt(e.target.value, 10));
    });
  }

  /* ---- Dashboard ---- */
  function refreshDashboard() {
    const avgMoisture = AIEngine._avgMoisture(sensors);
    const avgTemp = AIEngine._avgTemp(sensors);
    const avgHumidity = AIEngine._avgHumidity(sensors);
    const totalRain = AIEngine._totalRain(sensors);

    setText('metric-moisture', avgMoisture);
    setText('metric-temp', avgTemp);
    setText('metric-humidity', avgHumidity);
    setText('metric-rain', totalRain);

    renderCropProgress();
    renderDashboardAlerts();
  }

  function renderCropProgress() {
    const track = document.getElementById('stage-track');
    if (!track) return;

    track.innerHTML = CROP_STAGES.map(stage => {
      let cls = 'stage-segment';
      if (cropDay >= stage.days[1]) cls += ' completed';
      else if (cropDay >= stage.days[0]) cls += ' current';

      const progress = cropDay >= stage.days[0] && cropDay < stage.days[1]
        ? ((cropDay - stage.days[0]) / (stage.days[1] - stage.days[0])) * 100
        : cropDay >= stage.days[1] ? 100 : 0;

      return `<div class="${cls}" style="--progress: ${progress}%" title="${stage.name}"></div>`;
    }).join('');

    setText('current-stage-name', cropStage.name);
    setText('current-stage-day', `Day ${cropDay} of ~365`);
    setText('crop-day-num', cropDay);
  }

  function renderDashboardAlerts() {
    const list = document.getElementById('dashboard-alerts');
    if (!list) return;

    const top = alerts.filter(a => a.unread).slice(0, 3);
    list.innerHTML = top.length
      ? top.map(a => `
        <li>
          <span class="alert-dot ${a.type}"></span>
          <span>${a.title}</span>
        </li>
      `).join('')
      : '<li style="color: var(--text-muted)">No active alerts</li>';
  }

  /* ---- AI Analysis ---- */
  function runAIAnalysis() {
    const weather = { temp: 32, humidity: 62, desc: 'Partly Cloudy' };
    advisoryResult = AIEngine.analyze(sensors, cropStage, weather);

    updateQuickAdvisory(advisoryResult);
    updateFullAdvisory(advisoryResult);
    updateWeatherWidget(weather);
  }

  function updateQuickAdvisory(result) {
    const statusEl = document.getElementById('irrigation-status');
    if (statusEl) {
      statusEl.textContent = result.verdict.action;
      statusEl.className = `status-pill ${result.verdict.action}`;
    }

    setText('advisory-title', result.verdict.title);
    setText('advisory-desc', result.verdict.desc);
    setText('advisory-volume', result.irrigationVolume > 0 ? `${result.irrigationVolume} mm` : 'None');
    setText('advisory-window', result.bestWindow);
    setText('advisory-confidence', `${result.confidence}%`);
  }

  function updateFullAdvisory(result) {
    const icons = {
      irrigate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
      wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>',
    };

    const iconEl = document.getElementById('verdict-icon');
    if (iconEl) {
      iconEl.className = `verdict-icon ${result.verdict.action}`;
      iconEl.innerHTML = icons[result.verdict.action];
    }

    setText('verdict-title', result.verdict.title);
    setText('verdict-desc', result.verdict.desc);
    setText('param-eto', `${result.eto} mm/day`);
    setText('param-kc', result.kc.toFixed(2));
    setText('param-cwr', `${result.cwr} mm`);
    setText('param-rain', `${result.effectiveRain} mm`);
    setText('param-net', `${result.netIrrigation} mm`);

    renderFactors(result.factors);
  }

  function renderFactors(factors) {
    const list = document.getElementById('factor-list');
    if (!list) return;

    list.innerHTML = factors.map(f => `
      <div class="factor-item">
        <div class="factor-bar-wrap">
          <div class="factor-label">
            <span>${f.name}</span>
            <span>${typeof f.value === 'number' ? f.value.toFixed(1) : f.value}${f.max <= 100 && f.name.includes('Moisture') ? '%' : ''}</span>
          </div>
          <div class="factor-bar">
            <div class="factor-bar-fill ${f.status}" style="width: ${Math.min(100, (f.value / f.max) * 100)}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function updateWeatherWidget(weather) {
    setText('weather-temp', `${weather.temp}°C`);
    setText('weather-desc', weather.desc);
  }

  /* ---- Sensors ---- */
  function renderSensors(zoneFilter = 'all') {
    const grid = document.getElementById('sensor-grid');
    if (!grid) return;

    const filtered = zoneFilter === 'all'
      ? sensors
      : sensors.filter(s => s.zone === zoneFilter);

    grid.innerHTML = filtered.map(s => `
      <div class="sensor-card">
        <div class="sensor-card-header">
          <span class="sensor-id">${s.id}</span>
          <span class="sensor-status ${s.online ? '' : 'offline'}">
            <span class="dot"></span>
            ${s.online ? 'Online' : 'Offline'}
          </span>
        </div>
        <div class="sensor-readings">
          ${s.type === 'Soil Moisture' ? `
            <div class="reading">
              <span class="reading-label">Moisture</span>
              <span class="reading-value">${s.value}%</span>
            </div>
            <div class="reading">
              <span class="reading-label">Depth</span>
              <span class="reading-value">15 cm</span>
            </div>
          ` : s.type === 'Temp/Humidity' ? `
            <div class="reading">
              <span class="reading-label">Temperature</span>
              <span class="reading-value">${s.temperature}°C</span>
            </div>
            <div class="reading">
              <span class="reading-label">Humidity</span>
              <span class="reading-value">${s.humidity}%</span>
            </div>
          ` : `
            <div class="reading">
              <span class="reading-label">Rainfall</span>
              <span class="reading-value">${s.rainfall} mm</span>
            </div>
            <div class="reading">
              <span class="reading-label">Period</span>
              <span class="reading-value">24 hr</span>
            </div>
          `}
          <div class="reading">
            <span class="reading-label">Battery</span>
            <span class="reading-value">${s.battery}%</span>
          </div>
          <div class="reading">
            <span class="reading-label">Signal</span>
            <span class="reading-value">${s.signal} dBm</span>
          </div>
        </div>
        <span class="sensor-zone-tag">Zone ${s.zone} — ${ZONES[s.zone].name}</span>
      </div>
    `).join('');
  }

  function renderNetworkMap() {
    const container = document.getElementById('network-zones');
    if (!container) return;

    container.innerHTML = Object.entries(ZONES).map(([id, zone]) => {
      const zoneSensors = sensors.filter(s => s.zone === id);
      return `
        <div class="zone-node">
          <div class="node-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </div>
          <span>Zone ${id}</span>
          <small style="color: var(--text-muted); font-size: 0.7rem">${zone.name}</small>
          <div class="zone-sensors">
            ${zoneSensors.map(s => `<span class="mini-sensor ${s.online ? '' : 'offline'}" title="${s.id}"></span>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  /* ---- Field Map ---- */
  function renderFieldMap() {
    const map = document.getElementById('field-map');
    if (!map) return;

    map.innerHTML = Object.keys(ZONES).map(id => {
      const moisture = getZoneMoisture(sensors, id);
      const status = getZoneStatus(moisture);
      return `
        <div class="field-zone ${status}" data-zone="${id}">
          <span class="zone-label">Zone ${id}</span>
          <span class="zone-moisture">${moisture}%</span>
          <span class="zone-status-text">${status}</span>
        </div>
      `;
    }).join('');

    map.querySelectorAll('.field-zone').forEach(el => {
      el.addEventListener('click', () => selectZone(el.dataset.zone));
    });
  }

  function selectZone(zoneId) {
    document.querySelectorAll('.field-zone').forEach(z => z.classList.remove('selected'));
    document.querySelector(`.field-zone[data-zone="${zoneId}"]`)?.classList.add('selected');

    const zone = ZONES[zoneId];
    const moisture = getZoneMoisture(sensors, zoneId);
    const status = getZoneStatus(moisture);
    const zoneSensors = sensors.filter(s => s.zone === zoneId);

    const container = document.getElementById('zone-details');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Zone ${zoneId} — ${zone.name}</h3>
          <span class="status-pill ${status === 'optimal' ? 'irrigate' : status === 'moderate' ? 'wait' : 'skip'}">${status}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px">
          Area: ${zone.area} ha | Avg Moisture: ${moisture}% | Sensors: ${zoneSensors.length}
        </p>
        <div class="zone-detail-grid">
          ${zoneSensors.map(s => `
            <div class="zone-detail-item">
              <span>${s.id} (${s.type})</span>
              <strong>${s.type === 'Soil Moisture' ? s.value + '%' : s.type === 'Rain Gauge' ? s.rainfall + ' mm' : s.temperature + '°C / ' + s.humidity + '%'}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ---- Crop Stages ---- */
  function renderCropStages() {
    const timeline = document.getElementById('stages-timeline');
    if (!timeline) return;

    timeline.innerHTML = CROP_STAGES.map((stage, i) => {
      let cls = 'stage-card';
      if (cropDay >= stage.days[1]) cls += ' completed';
      else if (cropDay >= stage.days[0]) cls += ' active';
      else cls += ' upcoming';

      return `
        <div class="${cls}">
          <div class="stage-num">${i + 1}</div>
          <h4>${stage.name}</h4>
          <p>Day ${stage.days[0]}–${stage.days[1]}</p>
          <span class="kc-value">Kc = ${stage.kc}</span>
        </div>
      `;
    }).join('');
  }

  /* ---- Schedule ---- */
  function renderSchedule() {
    const body = document.getElementById('schedule-body');
    if (!body) return;

    const schedule = generateSchedule();
    body.innerHTML = schedule.map(row => `
      <tr>
        <td>${row.date}</td>
        <td>${row.eto} mm</td>
        <td>${row.moisture}%</td>
        <td>${row.rain} mm</td>
        <td><span class="rec-badge ${row.rec}">${row.rec}</span></td>
        <td>${row.volume > 0 ? row.volume + ' mm' : '—'}</td>
      </tr>
    `).join('');
  }

  /* ---- Alerts ---- */
  function renderAlerts(filter = 'all') {
    const list = document.getElementById('alerts-list');
    if (!list) return;

    const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
    const iconSvgs = {
      critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    list.innerHTML = filtered.map(a => `
      <div class="alert-card ${a.type} ${a.unread ? 'unread' : ''}">
        <div class="alert-icon-wrap">${iconSvgs[a.type]}</div>
        <div class="alert-body">
          <h4>${a.title}</h4>
          <p>${a.message}</p>
          <div class="alert-meta">
            <span>${a.time}</span>
            <span>Zone: ${a.zone === 'all' ? 'All' : a.zone}</span>
          </div>
        </div>
      </div>
    `).join('');

    updateAlertBadge();
  }

  function updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    const count = alerts.filter(a => a.unread).length;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  /* ---- Charts ---- */
  function initCharts() {
    initMoistureChart();
    initStageWaterChart();
    initWaterUsageChart();
    initEnvChart();
    renderSummary();
  }

  function chartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca89f', font: { family: 'DM Sans' } } },
      },
      scales: {
        x: { ticks: { color: '#6b7a6e' }, grid: { color: 'rgba(42, 53, 44, 0.5)' } },
        y: { ticks: { color: '#6b7a6e' }, grid: { color: 'rgba(42, 53, 44, 0.5)' } },
      },
    };
  }

  function initMoistureChart() {
    const ctx = document.getElementById('moisture-chart');
    if (!ctx) return;

    const history = generateMoistureHistory(7);
    charts.moisture = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.labels,
        datasets: [{
          label: 'Soil Moisture (%)',
          data: history.data,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#22c55e',
        }],
      },
      options: {
        ...chartDefaults(),
        plugins: {
          ...chartDefaults().plugins,
          annotation: {},
        },
      },
    });
  }

  function updateMoistureChart(days) {
    if (!charts.moisture) return;
    const history = generateMoistureHistory(days);
    charts.moisture.data.labels = history.labels;
    charts.moisture.data.datasets[0].data = history.data;
    charts.moisture.update();
  }

  function initStageWaterChart() {
    const ctx = document.getElementById('stage-water-chart');
    if (!ctx) return;

    charts.stageWater = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: CROP_STAGES.map(s => s.name),
        datasets: [{
          label: 'Crop Coefficient (Kc)',
          data: CROP_STAGES.map(s => s.kc),
          backgroundColor: CROP_STAGES.map((_, i) =>
            cropDay >= CROP_STAGES[i].days[0] && cropDay < CROP_STAGES[i].days[1]
              ? '#22c55e' : '#2a352c'
          ),
          borderRadius: 6,
        }],
      },
      options: chartDefaults(),
    });
  }

  function initWaterUsageChart() {
    const ctx = document.getElementById('water-usage-chart');
    if (!ctx) return;

    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    charts.waterUsage = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual Applied (mm)',
            data: [42, 38, 55, 48],
            backgroundColor: '#22c55e',
            borderRadius: 4,
          },
          {
            label: 'AI Recommended (mm)',
            data: [45, 35, 52, 50],
            backgroundColor: '#60a5fa',
            borderRadius: 4,
          },
        ],
      },
      options: chartDefaults(),
    });
  }

  function initEnvChart() {
    const ctx = document.getElementById('env-chart');
    if (!ctx) return;

    const labels = generateMoistureHistory(7).labels;
    charts.env = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: labels.map(() => Math.round(28 + Math.random() * 8)),
            borderColor: '#f87171',
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Humidity (%)',
            data: labels.map(() => Math.round(50 + Math.random() * 25)),
            borderColor: '#60a5fa',
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        ...chartDefaults(),
        scales: {
          x: { ticks: { color: '#6b7a6e' }, grid: { color: 'rgba(42, 53, 44, 0.5)' } },
          y: { position: 'left', ticks: { color: '#f87171' }, grid: { color: 'rgba(42, 53, 44, 0.5)' } },
          y1: { position: 'right', ticks: { color: '#60a5fa' }, grid: { drawOnChartArea: false } },
        },
      },
    });
  }

  function renderSummary() {
    const grid = document.getElementById('summary-grid');
    if (!grid) return;

    const items = [
      { value: '183 mm', label: 'Total Water Applied' },
      { value: '32%', label: 'Water Saved vs. Traditional' },
      { value: '94.2%', label: 'AI Prediction Accuracy' },
      { value: '12.5 ha', label: 'Monitored Area' },
    ];

    grid.innerHTML = items.map(i => `
      <div class="summary-item">
        <span class="summary-value">${i.value}</span>
        <span class="summary-label">${i.label}</span>
      </div>
    `).join('');
  }

  /* ---- Live Updates ---- */
  function startLiveUpdates() {
    setInterval(() => {
      sensors = sensors.map(s => {
        if (!s.online) return s;
        if (s.type === 'Soil Moisture') {
          s.value = Math.round(Math.max(20, Math.min(55, s.value + (Math.random() - 0.5) * 0.5)) * 10) / 10;
        }
        return s;
      });
      refreshDashboard();
    }, 15000);
  }

  function updateLastSync() {
    const el = document.getElementById('last-sync');
    if (el) {
      el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
  }

  /* ---- Utilities ---- */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
})();
