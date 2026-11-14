
const hisseler = ["ASELS", "TUPRS", "BIMAS", "THYAO", "AKBNK"];

const status = document.querySelector(".status");
const detail = status?.nextElementSibling;

function ema(values, period) {
  const multiplier = 2 / (period + 1);
  let result = values[0];
  const output = [result];

  for (let i = 1; i < values.length; i++) {
    result = (values[i] - result) * multiplier + result;
    output.push(result);
  }

  return output;
}

async function hisseAnaliz(hisse) {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
    hisse + ".IS?range=3mo&interval=1h";

  const response = await fetch(
    "https://proxy.cors.dev/" + url,
    { credentials: "omit" }
  );

  if (!response.ok) throw new Error("Veri alinamadi");

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result) throw new Error("Veri bulunamadi");

  const q = result.indicators.quote[0];
  const bars = [];

  result.timestamp.forEach((time, i) => {
    if (
      q.open[i] == null ||
      q.high[i] == null ||
      q.low[i] == null ||
      q.close[i] == null
    ) return;

    const date = new Date(time * 1000);
    const day = date.toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul"
    });

    bars.push({
      day,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] || 0
    });
  });

  const groups = {};

  bars.forEach(bar => {
    if (!groups[bar.day]) groups[bar.day] = [];
    groups[bar.day].push(bar);
  });

  const candles4h = [];

  Object.keys(groups).sort().forEach(day => {
    const dayBars = groups[day];

    for (let i = 0; i + 3 < dayBars.length; i += 4) {
      const group = dayBars.slice(i, i + 4);

      candles4h.push({
        open: group[0].open,
        high: Math.max(...group.map(x => x.high)),
        low: Math.min(...group.map(x => x.low)),
        close: group[3].close,
        volume: group.reduce((sum, x) => sum + x.volume, 0)
      });
    }
  });

  if (candles4h.length < 21) {
    throw new Error("Yeterli 4 saatlik veri yok");
  }

  const closes = candles4h.map(x => x.close);
  const ema8 = ema(closes, 8);
  const ema20 = ema(closes, 20);

  const last = closes.length - 1;

  return {
    hisse,
    fiyat: closes[last],
    ema8: ema8[last],
    ema20: ema20[last],
    mum: candles4h.length,
    kesişim:
      ema8[last] > ema20[last] &&
      ema8[last - 1] <= ema20[last - 1]
  };
}

async function bistTarama() {
  status.textContent = "4 saatlik teknik analiz yapiliyor...";

  const sonuc = [];

  for (const hisse of hisseler) {
    try {
      sonuc.push(await hisseAnaliz(hisse));
    } catch (error) {
      sonuc.push({ hisse, hata: error.message });
    }
  }

  status.textContent = "4 saatlik tarama tamamlandi!";

  detail.textContent = "Kontrol edilen hisse: " + hisseler.length;

  let liste = document.getElementById("hisse-listesi");

  if (!liste) {
    liste = document.createElement("div");
    liste.id = "hisse-listesi";
    detail.after(liste);
  }

  liste.innerHTML = "";

  sonuc.forEach(x => {
    const satir = document.createElement("p");

    satir.textContent = x.hata
      ? x.hisse + " | Hata: " + x.hata
      : x.hisse +
        " | Fiyat: " + x.fiyat.toFixed(2) +
        " | EMA 8: " + x.ema8.toFixed(2) +
        " | EMA 20: " + x.ema20.toFixed(2) +
        " | " + (x.kesişim ? "YENI YUKARI KESISIM" :
          x.ema8 > x.ema20 ? "EMA 8 USTTE" : "EMA 8 ALTTA");

    liste.appendChild(satir);
  });

  console.log("4 saatlik analiz:", sonuc);
}

bistTarama();
