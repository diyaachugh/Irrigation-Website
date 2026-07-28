/**
 * Mock data & configuration for Sugarcane IAAS
 */

const CONFIG = {
  cropVariety: 'Co 86032',
  plantDate: new Date('2026-06-15'),
  fieldArea: 12.5, // hectares
  location: 'Maharashtra, India',
};

const CROP_STAGES = [
  { id: 'germination', name: 'Germination', days: [0, 45], kc: 0.40, waterReq: 'Low' },
  { id: 'tillering', name: 'Tillering', days: [45, 120], kc: 0.65, waterReq: 'Moderate' },
  { id: 'grand_growth', name: 'Grand Growth', days: [120, 270], kc: 1.25, waterReq: 'High' },
  { id: 'maturity', name: 'Maturity', days: [270, 330], kc: 0.75, waterReq: 'Moderate' },
  { id: 'harvest', name: 'Harvest Ready', days: [330, 365], kc: 0.50, waterReq: 'Low' },
];

const ZONES = {
  A: { name: 'North Block', area: 4.2, sensors: ['SM-A01', 'SM-A02', 'TH-A01'] },
  B: { name: 'Central Block', area: 4.8, sensors: ['SM-B01', 'SM-B02', 'TH-B01', 'RF-B01'] },
  C: { name: 'South Block', area: 3.5, sensors: ['SM-C01', 'TH-C01'] },
};

function generateSensorData() {
  const sensors = [
    { id: 'SM-A01', type: 'Soil Moisture', zone: 'A', unit: '%', base: 42, variance: 8 },
    { id: 'SM-A02', type: 'Soil Moisture', zone: 'A', unit: '%', base: 38, variance: 6 },
    { id: 'TH-A01', type: 'Temp/Humidity', zone: 'A', unit: '°C/%', base: 28, variance: 4 },
    { id: 'SM-B01', type: 'Soil Moisture', zone: 'B', unit: '%', base: 35, variance: 7 },
    { id: 'SM-B02', type: 'Soil Moisture', zone: 'B', unit: '%', base: 31, variance: 5 },
    { id: 'TH-B01', type: 'Temp/Humidity', zone: 'B', unit: '°C/%', base: 29, variance: 3 },
    { id: 'RF-B01', type: 'Rain Gauge', zone: 'B', unit: 'mm', base: 2.5, variance: 1 },
    { id: 'SM-C01', type: 'Soil Moisture', zone: 'C', unit: '%', base: 28, variance: 6 },
    { id: 'TH-C01', type: 'Temp/Humidity', zone: 'C', unit: '°C/%', base: 30, variance: 4 },
  ];

  return sensors.map(s => {
    const noise = (Math.random() - 0.5) * s.variance;
    const value = Math.round((s.base + noise) * 10) / 10;
    const isMoisture = s.type === 'Soil Moisture';
    const isTempHum = s.type === 'Temp/Humidity';

    return {
      ...s,
      value: isMoisture ? value : null,
      temperature: isTempHum ? Math.round((s.base + noise) * 10) / 10 : null,
      humidity: isTempHum ? Math.round(55 + Math.random() * 20) : null,
      rainfall: s.type === 'Rain Gauge' ? value : null,
      battery: Math.round(75 + Math.random() * 25),
      signal: Math.round(-45 - Math.random() * 20),
      online: Math.random() > 0.05,
      lastReading: new Date(Date.now() - Math.random() * 300000),
    };
  });
}

function getDaysSincePlanting() {
  const now = new Date();
  return Math.floor((now - CONFIG.plantDate) / (1000 * 60 * 60 * 24));
}

function getCurrentStage(day) {
  for (const stage of CROP_STAGES) {
    if (day >= stage.days[0] && day < stage.days[1]) {
      const progress = ((day - stage.days[0]) / (stage.days[1] - stage.days[0])) * 100;
      return { ...stage, progress: Math.round(progress), dayInStage: day - stage.days[0] };
    }
  }
  return { ...CROP_STAGES[CROP_STAGES.length - 1], progress: 100, dayInStage: 0 };
}

function generateMoistureHistory(days = 7) {
  const data = [];
  const labels = [];
  let base = 38 + Math.random() * 10;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    base += (Math.random() - 0.45) * 4;
    base = Math.max(22, Math.min(55, base));
    data.push(Math.round(base * 10) / 10);
  }

  return { labels, data };
}

function generateAlerts() {
  return [
    {
      id: 1,
      type: 'critical',
      title: 'Low Soil Moisture — Zone C',
      message: 'Soil moisture in South Block (Zone C) has dropped to 28%. Immediate irrigation recommended to prevent crop stress.',
      time: '12 min ago',
      zone: 'C',
      unread: true,
    },
    {
      id: 2,
      type: 'warning',
      title: 'Sensor SM-B02 Battery Low',
      message: 'Battery level at 18%. Schedule maintenance within 7 days to avoid data gaps.',
      time: '1 hour ago',
      zone: 'B',
      unread: true,
    },
    {
      id: 3,
      type: 'warning',
      title: 'High ET₀ Expected Tomorrow',
      message: 'Reference evapotranspiration forecast at 6.8 mm/day. Consider early morning irrigation.',
      time: '3 hours ago',
      zone: 'all',
      unread: true,
    },
    {
      id: 4,
      type: 'info',
      title: 'Tillering Stage — Increased Water Need',
      message: 'Crop entering active tillering phase. Kc coefficient increased to 0.65. Adjust irrigation schedule.',
      time: '1 day ago',
      zone: 'all',
      unread: false,
    },
    {
      id: 5,
      type: 'info',
      title: 'Rainfall Detected — Zone B',
      message: 'Rain gauge RF-B01 recorded 2.5 mm in the last 24 hours. Irrigation deferred for Zone B.',
      time: '1 day ago',
      zone: 'B',
      unread: false,
    },
    {
      id: 6,
      type: 'info',
      title: 'Weekly AI Model Retrained',
      message: 'Irrigation advisory model updated with latest 30-day field data. Accuracy improved to 94.2%.',
      time: '3 days ago',
      zone: 'all',
      unread: false,
    },
  ];
}

function generateSchedule() {
  const schedule = [];
  const baseDate = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const eto = Math.round((4.5 + Math.random() * 3) * 10) / 10;
    const moisture = Math.round((30 + Math.random() * 20) * 10) / 10;
    const rain = Math.round(Math.random() * 8 * 10) / 10;
    let rec, volume;

    if (moisture < 32) {
      rec = 'irrigate';
      volume = Math.round((25 + Math.random() * 15) * 10) / 10;
    } else if (rain > 5) {
      rec = 'skip';
      volume = 0;
    } else {
      rec = 'wait';
      volume = Math.round((10 + Math.random() * 10) * 10) / 10;
    }

    schedule.push({
      date: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      eto,
      moisture,
      rain,
      rec,
      volume,
    });
  }

  return schedule;
}

function getZoneMoisture(sensors, zone) {
  const zoneSensors = sensors.filter(s => s.zone === zone && s.type === 'Soil Moisture');
  if (zoneSensors.length === 0) return 0;
  return Math.round(zoneSensors.reduce((sum, s) => sum + s.value, 0) / zoneSensors.length * 10) / 10;
}

function getZoneStatus(moisture) {
  if (moisture >= 38) return 'optimal';
  if (moisture >= 30) return 'moderate';
  return 'critical';
}
