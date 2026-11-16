
const hisseler = ["ASELS", "TUPRS", "BIMAS", "THYAO", "AKBNK"];

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

function ema(a, p) {
  const out = Array(a.length).fill(NaN);
  const m = 2 / (p + 1);
  let v = NaN;

  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i])) continue;
    v = Number.isFinite(v) ? v + m * (a[i] - v) : a[i];
    out[i] = v;
  }
  return out;
}

function sma(a, i, p) {
  if (i < p - 1) return NaN;
  const x = a.slice(i - p + 1, i + 1);
  if (!x.every(Number.isFinite)) return NaN;
  return x.reduce((s, v) => s + v, 0) / p;
}

function rsi(c, p = 14) {
  const out = Array(c.length).fill(NaN);
  let gain = 0, loss = 0;

  if (c.length <= p) return out;

  for (let i = 1; i <= p; i++) {
    const d = c[i] - c[i - 1];
    gain += Math.max(d, 0);
    loss += Math.max(-d, 0);
  }

  gain /= p;
  loss /= p;

  for (let i = p; i < c.length; i++) {
    if (i > p) {
      const d = c[i] - c[i - 1];
      gain = (gain * (p - 1) + Math.max(d, 0)) / p;
      loss = (loss * (p - 1) + Math.max(-d, 0)) / p;
    }

    out[i] = loss === 0 ? 100 :
      100 - 100 / (1 + gain / loss);
  }
  return out;
}

function stochastic(bars, p = 14, smooth = 6) {
  const raw = Array(bars.length).fill(NaN);

  for (let i = p - 1; i < bars.length; i++) {
    const group = bars.slice(i - p + 1, i + 1);
    const high = Math.max(...group.map(x => x.high));
    const low = Math.min(...group.map(x => x.low));

    raw[i] = high === low ? 0 :
      100 * (bars[i].close - low) / (high - low);
  }

  return ema(raw, smooth);
}

function cci(bars, p = 14) {
  const tp = bars.map(x => (x.high + x.low + x.close) / 3);
  const out = Array(bars.length).fill(NaN);

  for (let i = p - 1; i < bars.length; i++) {
    const avg = sma(tp, i, p);
    const group = tp.slice(i - p + 1, i + 1);
    const deviation = group.reduce(
      (s, x) => s + Math.abs(x - avg), 0
    ) / p;

    out[i] = deviation === 0 ? 0 :
      (tp[i] - avg) / (0.015 * deviation);
  }
  return out;
}

function williamsR(bars, p = 14) {
  const out = Array(bars.length).fill(NaN);

  for (let i = p - 1; i < bars.length; i++) {
    const group = bars.slice(i - p + 1, i + 1);
    const high = Math.max(...group.map(x => x.high));
    const low = Math.min(...group.map(x => x.low));

    out[i] = high === low ? 0 :
      -100 * (high - bars[i].close) / (high - low);
  }
  return out;
}

function mfi(bars, p = 14) {
  const out = Array(bars.length).fill(NaN);
  const tp = bars.map(x => (x.high + x.low + x.close) / 3);
  const flow = tp.map((x, i) => x * bars[i].volume);

  for (let i = p; i < bars.length; i++) {
    let positive = 0, negative = 0;

    for (let j = i - p + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) positive += flow[j];
      else if (tp[j] < tp[j - 1]) negative += flow[j];
    }

    out[i] = negative === 0 ? 100 :
      100 - 100 / (1 + positive / negative);
  }
  return out;
}

function momentum(c, p = 14) {
  const out = Array(c.length).fill(NaN);

  for (let i = p; i < c.length; i++) {
    out[i] = c[i] - c[i - p];
  }
  return out;
}

function ultimate(bars) {
  const out = Array(bars.length).fill(NaN);
  const bp = Array(bars.length).fill(0);
  const tr = Array(bars.length).fill(0);

  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].close;
    bp[i] = bars[i].close - Math.min(bars[i].low, prev);
    tr[i] = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prev),
      Math.abs(bars[i].low - prev)
    );
  }

  for (let i = 28; i < bars.length; i++) {
    function ratio(p) {
      let b = 0, t = 0;
      for (let j = i - p + 1; j <= i; j++) {
        b += bp[j];
        t += tr[j];
      }
      return t === 0 ? 0 : b / t;
    }

    out[i] = 100 * (
      4 * ratio(7) + 2 * ratio(14) + ratio(28)
    ) / 7;
  }
  return out;
}

function tkeHesapla(bars) {
  const c = bars.map(x => x.close);

  const components = {
    stokastik: stochastic(bars, 14, 6),
    rsi: rsi(c, 14),
    mfi: mfi(bars, 14),
    cci: cci(bars, 14),
    williams: williamsR(bars, 14),
    momentum: momentum(c, 14),
    ultimate: ultimate(bars)
  };

  const values = Array(c.length).fill(NaN);

  for (let i = 0; i < c.length; i++) {
    const v = Object.values(components).map(x => x[i]);

    if (v.every(Number.isFinite)) {
      values[i] = v.reduce((s, x) => s + x, 0) / 7;
    }
  }

  return { values, components };
}

async function hisseAnaliz(hisse) {
  try {
    const sembol = hisse + ".IS";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sembol}?range=3mo&interval=1h`;

    const cevap = await fetch(
      "https://proxy.cors.dev/" + url,
      { cache: "no-store" }
    );

    if (!cevap.ok) throw new Error("Veri alınamadı");

    const veri = await cevap.json();
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
    const canliFiyat = sonuc.meta.regularMarketPrice || sonSaatlik.kapanis;

    const gunler = {};

    saatlik.forEach(m => {
      const tarih = new Date(m.zaman * 1000);
      const gun = tarih.toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul"
      });

      const saat = Number(
        tarih.toLocaleString("en-GB", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
          hour12: false
        })
      );

      if (!gunler[gun]) gunler[gun] = [];
      gunler[gun].push({ ...m, saat });
    });

    const dortSaatlik = [];

    Object.keys(gunler).forEach(gun => {
      const barlar = gunler[gun].sort((a, b) => a.zaman - b.zaman);

      const gruplar = [
        barlar.filter(m => m.saat >= 10 && m.saat <= 13),
        barlar.filter(m => m.saat >= 14 && m.saat <= 17)
      ];

      gruplar.forEach(grup => {
        if (grup.length === 4) {
          dortSaatlik.push({
            zaman: grup[0].zaman,
            acilis: grup[0].acilis,
            yuksek: Math.max(...grup.map(m => m.yuksek)),
            dusuk: Math.min(...grup.map(m => m.dusuk)),
            kapanis: grup[3].kapanis,
            hacim: grup.reduce((toplam, m) => toplam + m.hacim, 0)
          });
        }
      });
    });

    if (dortSaatlik.length < 30) {
      throw new Error("Yeterli tamamlanmış 4 saatlik mum yok");
    }

    const kapanislar = dortSaatlik.map(m => m.kapanis);

    function ema(dizi, periyot) {
      const sonuc = [];
      const katsayi = 2 / (periyot + 1);
      let onceki = dizi[0];

      dizi.forEach((deger, i) => {
        onceki = i === 0
          ? deger
          : deger * katsayi + onceki * (1 - katsayi);
        sonuc.push(onceki);
      });

      return sonuc;
    }

    const ema8 = ema(kapanislar, 8);
    const ema20 = ema(kapanislar, 20);

    const son = dortSaatlik.length - 1;

    return {
      hisse,
      fiyat: kapanislar[son],
      canliFiyat,
      ema8: ema8[son],
      ema20: ema20[son],
      canliMum: sonSaatlik,
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

  for (const hisse of hisseler) {
    const satir = document.createElement("p");
    satir.textContent = hisse + " analiz ediliyor...";
    liste.appendChild(satir);

    try {
      const x = await hisseAnaliz(hisse);

      satir.textContent =
        x.hisse +
" | Fiyat: " + (x.fiyat ?? 0).toFixed(2) +
" | EMA8: " + (x.ema8 ?? 0).toFixed(2) +
" | EMA20: " + (x.ema20 ?? 0).toFixed(2) +
" | TKE: Henüz hesaplanmadı"
        " | TKE yön: " + (x.tkeYukari ? "YUKARI" : "AŞAĞI") +
        " | Sıfır altı dönüş: " + (x.sifirAltiDonus ? "EVET" : "Hayır") +
        " | Sıfır kesim: " + (x.sifirKesim ? "EVET" : "Hayır") +
        " | 20 kesim: " + (x.yirmiKesim ? "EVET" : "Hayır") +
        " | EMA kesim: " + (x.emaKesim ? "EVET" : "Hayır") +
        " | Mum: " + x.mum;

    } catch (error) {
      satir.textContent = hisse + " | Hata: " + error.message;
    }
  }

  status.textContent = "EMA ve TKE taraması tamamlandı!";
  detail.textContent = "Kontrol edilen hisse: " + hisseler.length;
}

bistTarama();
