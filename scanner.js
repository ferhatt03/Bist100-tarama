
const hisseler = ["ASELS", "TUPRS", "BIMAS", "THYAO", "AKBNK"];

function istanbulTarihSaat(timestamp) {
  const date = new Date(timestamp * 1000);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const get = key => parts.find(x => x.type === key).value;

  return {
    day: get("year") + "-" + get("month") + "-" + get("day"),
    hour: Number(get("hour"))
  };
}

function ema(values, period) {
  const multiplier = 2 / (period + 1);
  let result = values[0];
  const output = [result];

  for (let i = 1; i < values.length; i++) {
    result += (values[i] - result) * multiplier;
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

  if (!response.ok) throw new Error("Veri bağlantı hatası");

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result) throw new Error("Veri bulunamadı");

  const q = result.indicators.quote[0];

  const today = istanbulTarihSaat(Date.now() / 1000).day;
  const days = {};

  result.timestamp.forEach((timestamp, i) => {
    const time = istanbulTarihSaat(timestamp);

    if (
      time.day >= today ||
      time.hour < 10 ||
      time.hour > 17 ||
      q.open[i] == null ||
      q.high[i] == null ||
      q.low[i] == null ||
      q.close[i] == null
    ) return;

    if (!days[time.day]) days[time.day] = {};

    days[time.day][time.hour] = {
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] || 0
    };
  });

  const candles = [];

  Object.keys(days).sort().forEach(day => {
    const hours = days[day];

    for (const start of [10, 14]) {
      const expected = [0, 1, 2, 3].map(x => start + x);

      if (!expected.every(hour => hours[hour])) continue;

      const group = expected.map(hour => hours[hour]);

      candles.push({
        day,
        session: start,
        open: group[0].open,
        high: Math.max(...group.map(x => x.high)),
        low: Math.min(...group.map(x => x.low)),
        close: group[3].close,
        volume: group.reduce((sum, x) => sum + x.volume, 0)
      });
    }
  });

  if (candles.length < 21) {
    throw new Error("Yeterli tamamlanmış 4 saatlik mum yok");
  }

  const closes = candles.map(x => x.close);
  const ema8 = ema(closes, 8);
  const ema20 = ema(closes, 20);

  const last = closes.length - 1;

  return {
    hisse,
    fiyat: closes[last],
    ema8: ema8[last],
    ema20: ema20[last],
    mum: candles.length,
    kesisim:
      ema8[last] > ema20[last] &&
      ema8[last - 1] <= ema20[last - 1]
  };
}

async function bistTarama() {
  const status = document.querySelector(".status");
  const detail = status?.nextElementSibling;

  if (!status || !detail) {
    console.error("Tarama ekranındaki durum alanı bulunamadı.");
    return;
  }

  status.textContent = "Tamamlanmış 4 saatlik mumlar taranıyor...";
  detail.textContent = "Veriler kontrol ediliyor.";

  let liste = document.getElementById("hisse-listesi");

  if (!liste) {
    liste = document.createElement("div");
    liste.id = "hisse-listesi";
    detail.after(liste);
  }

  liste.replaceChildren();

  for (const hisse of hisseler) {
    const satir = document.createElement("p");
    satir.textContent = hisse + " analiz ediliyor...";
    liste.appendChild(satir);

    try {
      const x = await hisseAnaliz(hisse);

      satir.textContent =
        x.hisse +
        " | Fiyat: " + x.fiyat.toFixed(2) +
        " | EMA 8: " + x.ema8.toFixed(2) +
        " | EMA 20: " + x.ema20.toFixed(2) +
        " | " +
        (x.kesisim
          ? "YENİ YUKARI KESİŞİM"
          : x.ema8 > x.ema20
            ? "EMA 8 ÜSTTE"
            : "EMA 8 ALTTA") +
        " | Mum: " + x.mum;
    } catch (error) {
      satir.textContent = hisse + " | Hata: " + error.message;
    }
  }

  status.textContent = "4 saatlik tarama tamamlandı!";
  detail.textContent = "Kontrol edilen hisse: " + hisseler.length;
}

bistTarama();
