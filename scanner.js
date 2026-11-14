
// ======================================
// BIST100 TARAMA MOTORU
// EMA 8 / EMA 20
// ADX / DMI
// RVOL
// ======================================

function ema(values, period) {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);
  let result = values[0];

  for (let i = 1; i < values.length; i++) {
    result = (values[i] - result) * multiplier + result;
  }

  return result;
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateRVOL(volumes, period = 20) {
  if (volumes.length < period + 1) return null;

  const current = volumes[volumes.length - 1];
  const previous = volumes.slice(-period - 1, -1);

  const avgVolume = average(previous);
  return avgVolume > 0 ? current / avgVolume : null;
}

function calculateDMI(candles, period = 14) {
  if (candles.length < period + 1) return null;

  const tr = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const up = current.high - previous.high;
    const down = previous.low - current.low;

    tr.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    ));

    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }

  const smooth = (arr) => {
    let value = arr.slice(0, period).reduce((a, b) => a + b, 0);

    for (let i = period; i < arr.length; i++) {
      value = value - value / period + arr[i];
    }

    return value;
  };

  const trSum = smooth(tr);
  if (!trSum) return null;

  const plusDI = 100 * smooth(plusDM) / trSum;
  const minusDI = 100 * smooth(minusDM) / trSum;

  const dx = 100 * Math.abs(plusDI - minusDI) /
    Math.max(plusDI + minusDI, 0.000001);

  return {
    plusDI,
    minusDI,
    dx
  };
}

// ANA HİSSE ANALİZİ
function analyzeStock(symbol, candles) {
  if (!Array.isArray(candles) || candles.length < 30) {
    return { symbol, status: "Yetersiz veri" };
  }

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const ema8 = ema(closes.slice(-30), 8);
  const ema20 = ema(closes.slice(-60), 20);

  const dmi = calculateDMI(candles);
  const rvol = calculateRVOL(volumes);

  const price = closes[closes.length - 1];

  const trendUp = ema8 > ema20;
  const priceAboveEMA = price > ema8 && price > ema20;
  const dmiPositive = dmi && dmi.plusDI > dmi.minusDI;
  const volumeStrong = rvol !== null && rvol >= 1.2;

  let score = 0;

  if (trendUp) score += 25;
  if (priceAboveEMA) score += 25;
  if (dmiPositive) score += 25;
  if (volumeStrong) score += 25;

  return {
    symbol,
    price,
    ema8,
    ema20,
    dmi,
    rvol,
    score,
    status: score >= 75 ? "TAKİP" : "BEKLE"
  };
}

console.log("BIST100 Tarama Motoru hazır.");
