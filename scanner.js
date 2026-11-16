
const hisseler = ["ASELS", "TUPRS", "BIMAS", "THYAO", "AKBNK"];

const PERIYOT = 3600;
const KESISIM_BAKIS = 3;

// İstanbul saati
function istanbulZaman(timestamp) {
  if (!Number.isFinite(timestamp)) return "-";

  return new Date(timestamp * 1000).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short"
  });
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

// Stokastik
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

// MFI
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

// Momentum
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

    if ([r7, r14, r28].every(Number.isFinite)) {
      out[i] = 100 * (4 * r7 + 2 * r14 + r28) / 7;
    }
  }

  return out;
}

// TKE - mevcut formülümüz
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

  return {
    values,
    tkeEma: ema(values, 5)
  };
}

// Son 3 mumda yukarı kesişim
function yukariKesisim(a, b, son, bakis = 3) {
  const baslangic = Math.max(1, son - bakis + 1);

  for (let i = baslangic; i <= son; i++) {
    if (
      Number.isFinite(a[i - 1]) &&
      Number.isFinite(b[i - 1]) &&
      Number.isFinite(a[i]) &&
      Number.isFinite(b[i]) &&
      a[i - 1] <= b[i - 1] &&
      a[i] > b[i]
    ) {
      return true;
    }
  }

  return false;
}

// Seviyeyi yukarı kesme
function seviyeKesisim(a, seviye, son, bakis = 3) {
  const baslangic = Math.max(1, son - bakis + 1);

  for (let i = baslangic; i <= son; i++) {
    if (
      Number.isFinite(a[i - 1]) &&
      Number.isFinite(a[i]) &&
      a[i - 1] <= seviye &&
      a[i] > seviye
    ) {
      return true;
    }
  }

  return false;
}

function formatFiyat(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

// Saatlik hisse analizi
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
      throw new Error("Yahoo veri bağlantısı başarısız: " + cevap.status);
    }

    const veri = await cevap.json();

    if (!veri.chart?.result?.[0]) {
      throw new Error("Hisse verisi bulunamadı");
    }

    const sonuc = veri.chart.result[0];
    const zamanlar = sonuc.timestamp || [];
    const mumlar = sonuc.indicators.quote[0];
    const meta = sonuc.meta || {};

    const simdi = Math.floor(Date.now() / 1000);
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
        open: Number(mumlar.open[i]),
        high: Number(mumlar.high[i]),
        low: Number(mumlar.low[i]),
        close: Number(mumlar.close[i]),
        volume: Number(mumlar.volume[i] || 0)
      });
    }

    saatlik.sort((a, b) => a.zaman - b.zaman);

    if (saatlik.length < 40) {
      throw new Error("Yeterli saatlik veri yok");
    }

    // Tamamlanmış saatlik mumları seç
    const kapanmisMumlar = saatlik.filter(
      m => m.zaman + PERIYOT <= simdi
    );

    if (kapanmisMumlar.length < 40) {
      throw new Error("Yeterli kapanmış saatlik mum yok");
    }

    const sonHamMum = saatlik[saatlik.length - 1];
    const sonMum = kapanmisMumlar[kapanmisMumlar.length - 1];

    const canliFiyat =
      Number.isFinite(Number(meta.regularMarketPrice)) &&
      Number(meta.regularMarketPrice) > 0
        ? Number(meta.regularMarketPrice)
        : sonHamMum.close;

    const canliFiyatKaynak =
      Number.isFinite(Number(meta.regularMarketPrice)) &&
      Number(meta.regularMarketPrice) > 0
        ? "Yahoo canlı piyasa fiyatı"
        : "Son ham mum kapanışı (canlı olmayabilir)";

    const kapanislar = kapanmisMumlar.map(m => m.close);

    const ema8 = ema(kapanislar, 8);
    const ema20 = ema(kapanislar, 20);

    const tkeSonuc = tkeHesapla(kapanmisMumlar);
    const tke = tkeSonuc.values;
    const tkeEma = tkeSonuc.tkeEma;

    const son = kapanmisMumlar.length - 1;
    const onceki = son - 1;

    const sonTke = tke[son];
    const oncekiTke = tke[onceki];

    if (
      !Number.isFinite(sonTke) ||
      !Number.isFinite(oncekiTke) ||
      !Number.isFinite(ema8[son]) ||
      !Number.isFinite(ema20[son])
    ) {
      throw new Error("Teknik göstergeler hesaplanamadı");
    }

    const emaKesim = yukariKesisim(
      ema8, ema20, son, KESISIM_BAKIS
    );

    const yirmiKesim = seviyeKesisim(
      tke, 20, son, KESISIM_BAKIS
    );

    const sifirKesim = seviyeKesisim(
      tke, 0, son, KESISIM_BAKIS
    );

    const sifirAltiDonus =
      sonTke < 0 && sonTke > oncekiTke;

    const tkeYukari = sonTke > oncekiTke;

    const anaSinyal = emaKesim && yirmiKesim;

    const hacimBaslangic = Math.max(0, son - 20);

    const oncekiHacimler = kapanmisMumlar
      .slice(hacimBaslangic, son)
      .map(m => m.volume);

    const ortHacim = oncekiHacimler.length
      ? oncekiHacimler.reduce((a, b) => a + b, 0) /
        oncekiHacimler.length
      : 0;

    const hacimOrani = ortHacim > 0
      ? sonMum.volume / ortHacim
      : NaN;

    // Veri zamanı kontrolleri
    const sonHamYasDakika =
      (simdi - sonHamMum.zaman) / 60;

    const piyasaVeriZamani =
      Number(meta.regularMarketTime) || NaN;

    const piyasaVeriYasiDakika =
      Number.isFinite(piyasaVeriZamani)
        ? (simdi - piyasaVeriZamani) / 60
        : NaN;

    return {
      hisse,
      fiyat: sonMum.close,
      canliFiyat,
      canliFiyatKaynak,

      ema8: ema8[son],
      ema20: ema20[son],

      emaDurum: ema8[son] > ema20[son]
        ? "EMA8 ÜSTTE"
        : "EMA8 ALTTA",

      tke: sonTke,
      tkeEma: tkeEma[son],
      tkeYukari,

      sifirAltiDonus,
      sifirKesim,
      yirmiKesim,
      emaKesim,
      anaSinyal,

      fiyatEma20Ustu: sonMum.close > ema20[son],

      hacim: sonMum.volume,
      hacimOrani,

      mum: sonMum.zaman,
      mumKapanisZamani: sonMum.zaman + PERIYOT,

      veriMumu: sonHamMum.zaman,
      veriYasiDakika: sonHamYasDakika,

      piyasaVeriZamani,
      piyasaVeriYasiDakika,

      mumSayisi: kapanmisMumlar.length,
      hamMumSayisi: saatlik.length,

      durum: "Kapanmış saatlik mum"
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

  const taramaZamani = new Date();

  status.textContent = "1 saatlik EMA ve TKE taraması yapılıyor...";
  detail.textContent = "Yahoo verileri ve kapanmış mumlar kontrol ediliyor.";

  let liste = document.getElementById("hisse-listesi");

  if (!liste) {
    liste = document.createElement("div");
    liste.id = "hisse-listesi";
    detail.after(liste);
  }

  liste.replaceChildren();

  let basarili = 0;
  let sinyalSayisi = 0;

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

    if (x.anaSinyal) sinyalSayisi++;

    const sinyalMetni = x.anaSinyal
      ? "ANA SİNYAL: EMA + TKE ONAYLI"
      : "Ana sinyal yok";

    const veriUyarisi =
      x.veriYasiDakika > 120
        ? " | UYARI: Yahoo mum verisi eski olabilir!"
        : "";

    satir.textContent =
      x.hisse +
      " | Kapanmış fiyat: " + formatFiyat(x.fiyat) +
      " | Canlı fiyat: " + formatFiyat(x.canliFiyat) +
      " | EMA8: " + formatFiyat(x.ema8) +
      " | EMA20: " + formatFiyat(x.ema20) +
      " | EMA durumu: " + x.emaDurum +
      " | TKE: " + formatFiyat(x.tke) +
      " | TKE EMA: " + formatFiyat(x.tkeEma) +
      " | TKE yön: " + (x.tkeYukari ? "YUKARI" : "AŞAĞI") +
      " | Sıfır altı dönüş: " + (x.sifirAltiDonus ? "EVET" : "Hayır") +
      " | Sıfır kesim: " + (x.sifirKesim ? "EVET" : "Hayır") +
      " | TKE 20 kesim: " + (x.yirmiKesim ? "EVET" : "Hayır") +
      " | EMA kesim: " + (x.emaKesim ? "EVET" : "Hayır") +
      " | Fiyat EMA20 üstü: " + (x.fiyatEma20Ustu ? "EVET" : "Hayır") +
      " | Hacim/Ort.: " + formatFiyat(x.hacimOrani) + "x" +
      " | " + sinyalMetni +
      " | Son kapanmış mum başlangıcı: " + istanbulZaman(x.mum) +
      " | Mum kapanış zamanı: " + istanbulZaman(x.mumKapanisZamani) +
      " | Yahoo son ham mum: " + istanbulZaman(x.veriMumu) +
      " | Ham veri yaşı: " + formatFiyat(x.veriYasiDakika) + " dk" +
      " | Piyasa veri zamanı: " + istanbulZaman(x.piyasaVeriZamani) +
      " | Piyasa veri yaşı: " + formatFiyat(x.piyasaVeriYasiDakika) + " dk" +
      " | Ham mum sayısı: " + x.hamMumSayisi +
      " | " + x.canliFiyatKaynak +
      veriUyarisi;
  }

  status.textContent = "1 saatlik tarama tamamlandı!";

  detail.textContent =
    "Kontrol edilen hisse: " + hisseler.length +
    " | Başarılı analiz: " + basarili +
    " | Ana sinyal: " + sinyalSayisi +
    " | Tarama saati: " +
    taramaZamani.toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul"
    });
}

bistTarama();
