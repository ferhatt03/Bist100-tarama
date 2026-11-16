
const hisseler = ["ASELS", "TUPRS", "BIMAS", "THYAO", "AKBNK"];

// İstanbul saatini al
function istanbulZaman(timestamp) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(timestamp * 1000));

  const get = k => parts.find(x => x.type === k).value;

  return {
    day: get("year") + "-" + get("month") + "-" + get("day"),
    hour: Number(get("hour"))
  };
}

// EMA
function ema(a, p) {
  const out = Array(a.length).fill(NaN);
  const k = 2 / (p + 1);
  let previous = NaN;

  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i])) continue;

    previous = Number.isFinite(previous)
      ? a[i] * k + previous * (1 - k)
      : a[i];

    out[i] = previous;
  }

  return out;
}

// SMA
function sma(a, i, p) {
  if (i < p - 1) return NaN;

  const values = a.slice(i - p + 1, i + 1);
  if (!values.every(Number.isFinite)) return NaN;

  return values.reduce((s, x) => s + x, 0) / p;
}

// RSI - Wilder
function rsi(close, p = 14) {
  const out = Array(close.length).fill(NaN);
  if (close.length <= p) return out;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= p; i++) {
    const d = close[i] - close[i - 1];
    gain += Math.max(d, 0);
    loss += Math.max(-d, 0);
  }

  gain /= p;
  loss /= p;

  for (let i = p; i < close.length; i++) {
    if (i > p) {
      const d = close[i] - close[i - 1];
      gain = (gain * (p - 1) + Math.max(d, 0)) / p;
      loss = (loss * (p - 1) + Math.max(-d, 0)) / p;
    }

    out[i] = loss === 0
      ? 100
      : 100 - 100 / (1 + gain / loss);
  }

  return out;
}

// Stokastik: TradingView ta.stoch
function stochastic(bars, p = 14) {
  const out = Array(bars.length).fill(NaN);

  for (let i = p - 1; i < bars.length; i++) {
    const group = bars.slice(i - p + 1, i + 1);
    const highest = Math.max(...group.map(x => x.high));
    const lowest = Math.min(...group.map(x => x.low));

    out[i] = highest === lowest
      ? 0
      : 100 * (bars[i].close - lowest) / (highest - lowest);
  }

  return out;
}

// CCI
function cci(bars, p = 14) {
  const tp = bars.map(x =>
    (x.high + x.low + x.close) / 3
  );

  const out = Array(bars.length).fill(NaN);

  for (let i = p - 1; i < bars.length; i++) {
    const avg = sma(tp, i, p);
    const group = tp.slice(i - p + 1, i + 1);

    const deviation = group.reduce(
      (sum, x) => sum + Math.abs(x - avg), 0
    ) / p;

    out[i] = deviation === 0
      ? 0
      : (tp[i] - avg) / (0.015 * deviation);
  }

  return out;
}

// Williams %R
function williamsR(bars, p = 14) {
  const out = Array(bars.length).fill(NaN);

  for (let i = p - 1; i < bars.length; i++) {
    const group = bars.slice(i - p + 1, i + 1);
    const highest = Math.max(...group.map(x => x.high));
    const lowest = Math.min(...group.map(x => x.low));

    out[i] = highest === lowest
      ? 0
      : -100 * (highest - bars[i].close) / (highest - lowest);
  }

  return out;
}

// MFI - gönderdiğin Pine formülüne göre
function mfi(bars, p = 14) {
  const out = Array(bars.length).fill(NaN);

  const tp = bars.map(x =>
    (x.high + x.low + x.close) / 3
  );

  for (let i = p; i < bars.length; i++) {
    let upper = 0;
    let lower = 0;

    for (let j = i - p + 1; j <= i; j++) {
      const change = tp[j] - tp[j - 1];

      if (change > 0) {
        upper += bars[j].volume * tp[j];
      } else if (change < 0) {
        lower += bars[j].volume * tp[j];
      }
    }

    if (lower === 0 && upper > 0) {
      out[i] = 100;
    } else if (upper === 0 && lower > 0) {
      out[i] = 0;
    } else if (upper + lower > 0) {
      out[i] = 100 - 100 / (1 + upper / lower);
    }
  }

  return out;
}

// Momentum - Pine: close / close[period] * 100
function momentum(close, p = 14) {
  const out = Array(close.length).fill(NaN);

  for (let i = p; i < close.length; i++) {
    out[i] = close[i - p] === 0
      ? NaN
      : close[i] / close[i - p] * 100;
  }

  return out;
}

// Ultimate Oscillator
function ultimate(bars) {
  const out = Array(bars.length).fill(NaN);
  const bp = Array(bars.length).fill(0);
  const tr = Array(bars.length).fill(0);

  for (let i = 1; i < bars.length; i++) {
    const previousClose = bars[i - 1].close;

    const high = Math.max(bars[i].high, previousClose);
    const low = Math.min(bars[i].low, previousClose);

    bp[i] = bars[i].close - low;
    tr[i] = high - low;
  }

  for (let i = 27; i < bars.length; i++) {
    function ratio(p) {
      let bpSum = 0;
      let trSum = 0;

      for (let j = i - p + 1; j <= i; j++) {
        bpSum += bp[j];
        trSum += tr[j];
      }

      return trSum === 0 ? NaN : bpSum / trSum;
    }

    const r7 = ratio(7);
    const r14 = ratio(14);
    const r28 = ratio(28);

    if (
      Number.isFinite(r7) &&
      Number.isFinite(r14) &&
      Number.isFinite(r28)
    ) {
      out[i] = 100 * (4 * r7 + 2 * r14 + r28) / 7;
    }
  }

  return out;
}

// TKE - Yaşar Erdinç göstergesi
function tkeHesapla(bars) {
  const close = bars.map(x => x.close);

  const components = {
    ultimate: ultimate(bars),
    momentum: momentum(close, 14),
    cci: cci(bars, 14),
    rsi: rsi(close, 14),
    williams: williamsR(bars, 14),
    stochastic: stochastic(bars, 14),
    mfi: mfi(bars, 14)
  };

  const values = Array(close.length).fill(NaN);

  for (let i = 0; i < close.length; i++) {
    const parts = Object.values(components).map(x => x[i]);

    if (parts.every(Number.isFinite)) {
      values[i] = parts.reduce((sum, x) => sum + x, 0) / 7;
    }
  }

  const tkeEma = ema(values, 5);

  return { values, tkeEma };
}

// Sayı biçimlendirme
function formatFiyat(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

// Hisse analizi
async function hisseAnaliz(hisse) {
  try {
    const sembol = hisse + ".IS";

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${sembol}?range=3mo&interval=1h`;

    const cevap = await fetch(
      "https://proxy.cors.dev/" + url,
      { cache: "no-store" }
    );

    if (!cevap.ok) {
      throw new Error("Veri alınamadı");
    }

    const veri = await cevap.json();

    if (!veri.chart || !veri.chart.result || !veri.chart.result[0]) {
      throw new Error("Hisse verisi bulunamadı");
    }

    const sonuc = veri.chart.result[0];
    const zamanlar = sonuc.timestamp;
    const mumlar = sonuc.indicators.quote[0];

    const saatlik = [];

    for (let i = 0; i < zamanlar.length; i++) {
      if (
        mumlar.open[i] == null ||
        mumlar.high[i] == null ||
        mumlar.low[i] == null ||
        mumlar.close[i] == null
      ) continue;

      saatlik.push({
        zaman: zamanlar[i],
        acilis: mumlar.open[i],
        yuksek: mumlar.high[i],
        dusuk: mumlar.low[i],
        kapanis: mumlar.close[i],
        hacim: mumlar.volume[i] || 0
      });
    }

    if (saatlik.length < 40) {
      throw new Error("Yeterli saatlik veri yok");
    }

    const sonSaatlik = saatlik[saatlik.length - 1];

    const canliFiyat =
      sonuc.meta.regularMarketPrice || sonSaatlik.kapanis;

    // Saatlik mumları İstanbul saatine göre grupla
    const gunler = {};

    saatlik.forEach(m => {
      const zaman = istanbulZaman(m.zaman);

      if (!gunler[zaman.day]) {
        gunler[zaman.day] = [];
      }

      gunler[zaman.day].push({
        ...m,
        saat: zaman.hour
      });
    });

    // Dört saatlik mumları oluştur
    const dortSaatlik = [];

    Object.keys(gunler).sort().forEach(gun => {
      const barlar = gunler[gun].sort(
        (a, b) => a.zaman - b.zaman
      );

      const gruplar = [
        barlar.filter(m => m.saat >= 10 && m.saat <= 13),
        barlar.filter(m => m.saat >= 14 && m.saat <= 17)
      ];

      gruplar.forEach(grup => {
        if (grup.length === 4) {
          dortSaatlik.push({
            zaman: grup[0].zaman,
            open: grup[0].acilis,
            high: Math.max(...grup.map(m => m.yuksek)),
            low: Math.min(...grup.map(m => m.dusuk)),
            close: grup[3].kapanis,
            volume: grup.reduce(
              (sum, m) => sum + m.hacim, 0
            )
          });
        }
      });
    });

    if (dortSaatlik.length < 40) {
      throw new Error("Yeterli tamamlanmış 4 saatlik mum yok");
    }

    const kapanislar = dortSaatlik.map(m => m.close);

    const ema8 = ema(kapanislar, 8);
    const ema20 = ema(kapanislar, 20);

    const tkeSonuc = tkeHesapla(dortSaatlik);
    const tke = tkeSonuc.values;
    const tkeEma = tkeSonuc.tkeEma;

    const son = dortSaatlik.length - 1;
    const onceki = son - 1;

    const sonTke = tke[son];
    const oncekiTke = tke[onceki];
    const ikiOncekiTke = tke[son - 2];

    if (
      !Number.isFinite(sonTke) ||
      !Number.isFinite(oncekiTke)
    ) {
      throw new Error("TKE hesaplamak için yeterli veri yok");
    }

    return {
      hisse,
      fiyat: kapanislar[son],
      canliFiyat,
      ema8: ema8[son],
      ema20: ema20[son],

      tke: sonTke,
      tkeEma: tkeEma[son],

      tkeYukari: sonTke > oncekiTke,

      // TKE sıfırın altında ve yönü yukarı dönmüş
      sifirAltiDonus:
        sonTke < 0 && sonTke > oncekiTke,

      // TKE sıfır çizgisini yukarı kesmiş
      sifirKesim:
        oncekiTke <= 0 && sonTke > 0,

      // TKE 20 seviyesini yukarı kesmiş
      yirmiKesim:
        oncekiTke <= 20 && sonTke > 20,

      // EMA8, EMA20'yi yukarı kesmiş
      emaKesim:
        ema8[onceki] <= ema20[onceki] &&
        ema8[son] > ema20[son],

      mum: dortSaatlik[son].zaman,
      mumSayisi: dortSaatlik.length,
      durum: "Tamamlanmış 4 saatlik mum"
    };

  } catch (hata) {
    return {
      hisse,
      hata: hata.message
    };
  }
}

// BIST tarama ekranı
async function bistTarama() {
  const status = document.querySelector(".status");
  const detail = status?.nextElementSibling;

  if (!status || !detail) {
    console.error("Tarama ekranı bulunamadı");
    return;
  }

  status.textContent = "EMA ve TKE hesaplanıyor...";
  detail.textContent = "Beş hisse kontrol ediliyor.";

  let liste = document.getElementById("hisse-listesi");

  if (!liste) {
    liste = document.createElement("div");
    liste.id = "hisse-listesi";
    detail.after(liste);
  }

  liste.replaceChildren();

  let basarili = 0;

  for (const hisse of hisseler) {
    const satir = document.createElement("p");
    satir.textContent = hisse + " analiz ediliyor...";
    liste.appendChild(satir);

    const x = await hisseAnaliz(hisse);

    if (x.hata) {
      satir.textContent = x.hisse + " | Hata: " + x.hata;
      continue;
    }

    basarili++;

    satir.textContent =
      x.hisse +
      " | Fiyat: " + formatFiyat(x.fiyat) +
      " | Canlı fiyat: " + formatFiyat(x.canliFiyat) +
      " | EMA8: " + formatFiyat(x.ema8) +
      " | EMA20: " + formatFiyat(x.ema20) +
      " | TKE: " + formatFiyat(x.tke) +
      " | TKE yön: " + (x.tkeYukari ? "YUKARI" : "AŞAĞI") +
      " | Sıfır altı dönüş: " + (x.sifirAltiDonus ? "EVET" : "Hayır") +
      " | Sıfır kesim: " + (x.sifirKesim ? "EVET" : "Hayır") +
      " | 20 kesim: " + (x.yirmiKesim ? "EVET" : "Hayır") +
      " | EMA kesim: " + (x.emaKesim ? "EVET" : "Hayır") +
      " | Mum: " + new Date(x.mum * 1000).toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul"
      });
  }

  status.textContent = "EMA ve TKE taraması tamamlandı!";
  detail.textContent =
    "Kontrol edilen hisse: " + hisseler.length +
    " | Başarılı analiz: " + basarili;
}

bistTarama();
