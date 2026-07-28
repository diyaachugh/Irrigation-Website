/**
 * AI Irrigation Advisory Engine
 * Uses FAO-56 inspired calculations with crop coefficients
 */

const AIEngine = {
  /**
   * Calculate reference evapotranspiration (simplified Hargreaves)
   */
  calcET0(temp, humidity) {
    const eto = 0.0023 * (temp + 17.8) * Math.sqrt(Math.max(0, 100 - humidity)) * 0.408;
    return Math.round(eto * 100) / 100;
  },

  /**
   * Get crop coefficient for current stage
   */
  getKc(stage) {
    return stage.kc;
  },

  /**
   * Calculate crop water requirement
   */
  calcCWR(eto, kc) {
    return Math.round(eto * kc * 100) / 100;
  },

  /**
   * Main advisory calculation
   */
  analyze(sensorData, cropStage, weather) {
    const avgMoisture = this._avgMoisture(sensorData);
    const avgTemp = this._avgTemp(sensorData);
    const avgHumidity = this._avgHumidity(sensorData);
    const totalRain = this._totalRain(sensorData);

    const eto = this.calcET0(weather.temp || avgTemp, weather.humidity || avgHumidity);
    const kc = this.getKc(cropStage);
    const cwr = this.calcCWR(eto, kc);
    const effectiveRain = Math.min(totalRain, cwr * 0.8);
    const netIrrigation = Math.max(0, cwr - effectiveRain);

    const moistureDeficit = this._moistureDeficit(avgMoisture, cropStage);
    const verdict = this._determineVerdict(avgMoisture, netIrrigation, totalRain, cropStage);
    const confidence = this._calcConfidence(sensorData, weather);

    const factors = [
      { name: 'Soil Moisture Level', value: avgMoisture, max: 55, status: avgMoisture >= 38 ? 'good' : avgMoisture >= 30 ? 'moderate' : 'low' },
      { name: 'Crop Stage Demand', value: kc * 100, max: 130, status: kc > 1 ? 'moderate' : 'good' },
      { name: 'Temperature Stress', value: avgTemp, max: 45, status: avgTemp > 38 ? 'low' : avgTemp > 33 ? 'moderate' : 'good' },
      { name: 'Humidity Index', value: avgHumidity, max: 100, status: avgHumidity < 40 ? 'low' : avgHumidity < 60 ? 'moderate' : 'good' },
      { name: 'Recent Rainfall', value: totalRain * 10, max: 50, status: totalRain > 5 ? 'good' : totalRain > 2 ? 'moderate' : 'low' },
    ];

    return {
      verdict,
      eto,
      kc,
      cwr,
      effectiveRain,
      netIrrigation,
      avgMoisture,
      moistureDeficit,
      confidence,
      factors,
      irrigationVolume: verdict.action === 'irrigate' ? Math.round(netIrrigation + moistureDeficit * 0.3) : 0,
      bestWindow: this._bestWindow(weather),
    };
  },

  _avgMoisture(sensors) {
    const m = sensors.filter(s => s.type === 'Soil Moisture' && s.online);
    if (m.length === 0) return 35;
    return Math.round(m.reduce((s, x) => s + x.value, 0) / m.length * 10) / 10;
  },

  _avgTemp(sensors) {
    const t = sensors.filter(s => s.temperature != null && s.online);
    if (t.length === 0) return 32;
    return Math.round(t.reduce((s, x) => s + x.temperature, 0) / t.length * 10) / 10;
  },

  _avgHumidity(sensors) {
    const h = sensors.filter(s => s.humidity != null && s.online);
    if (h.length === 0) return 62;
    return Math.round(h.reduce((s, x) => s + x.humidity, 0) / h.length);
  },

  _totalRain(sensors) {
    const r = sensors.filter(s => s.rainfall != null);
    if (r.length === 0) return 2.5;
    return Math.round(r.reduce((s, x) => s + x.rainfall, 0) * 10) / 10;
  },

  _moistureDeficit(moisture, stage) {
    const optimal = stage.kc > 1 ? 42 : stage.kc > 0.6 ? 38 : 35;
    return Math.max(0, Math.round((optimal - moisture) * 10) / 10);
  },

  _determineVerdict(moisture, netIrrigation, rain, stage) {
    if (rain > 8) {
      return {
        action: 'skip',
        title: 'Skip Irrigation — Adequate Rainfall',
        desc: `Recent rainfall of ${rain} mm meets crop water needs. Monitor soil moisture over the next 48 hours.`,
      };
    }

    if (moisture < 30 || (moisture < 35 && stage.kc >= 0.65)) {
      return {
        action: 'irrigate',
        title: 'Irrigate Now — Moisture Below Threshold',
        desc: `Soil moisture at ${moisture}% is below the ${stage.name} stage optimum. Apply irrigation during the early morning window to minimize evaporation losses.`,
      };
    }

    if (moisture < 38 && netIrrigation > 15) {
      return {
        action: 'irrigate',
        title: 'Irrigate Today — Moderate Deficit',
        desc: `Crop water requirement of ${netIrrigation.toFixed(1)} mm exceeds available soil moisture. Light to moderate irrigation recommended.`,
      };
    }

    if (moisture >= 38 && moisture <= 50) {
      return {
        action: 'wait',
        title: 'Wait — Moisture Adequate',
        desc: `Soil moisture at ${moisture}% is within optimal range for ${stage.name} stage. Next irrigation likely needed in 2–3 days.`,
      };
    }

    return {
      action: 'wait',
      title: 'Monitor — No Action Required',
      desc: 'Current conditions are favorable. Continue monitoring sensor readings and weather forecasts.',
    };
  },

  _calcConfidence(sensors, weather) {
    const onlineRatio = sensors.filter(s => s.online).length / sensors.length;
    const base = 85 + onlineRatio * 10;
    return Math.min(98, Math.round(base + Math.random() * 3));
  },

  _bestWindow(weather) {
    const temp = weather.temp || 32;
    if (temp > 35) return '5:00 AM – 7:00 AM';
    if (temp > 30) return '5:30 AM – 8:00 AM';
    return '6:00 AM – 9:00 AM';
  },
};
