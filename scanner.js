
const hisseler = ["ASELS", "TUPRS", "BIMAS", "THYAO", "AKBNK"];

const PERIYOT = 3600;
const KESISIM_BAKIS = 3;
const TKE_EMA_PERIYODU = 5;
const VERI_ARALIGI = "3mo";

function istanbulZaman(timestamp) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp * 1000));
}

function sayi(n) {
  return Number.isFinite(n) ? n : NaN;
}

function ortalama(dizi) {
  const gecerli = dizi.filter(Number.isFinite);
  return gecerli.length ? gecerli.reduce((a, b) => a + b, 0) / gecerli.length : NaN;
}

function ema(dizi, periyot) {
  const sonuc = Array(dizi.length).fill(NaN);
  const ilk = dizi.findIndex(Number.isFinite);
  if (ilk < 0 || dizi.length - ilk < periyot) return sonuc;

  const baslangic = ortalama(dizi.slice(ilk, ilk + periyot));
  if (!Number.isFinite(baslangic)) return sonuc;

  let onceki = baslangic;
  const ilkIndex = ilk + periyot - 1;
  sonuc[ilkIndex] = onceki;

  const carpan = 2 / (periyot + 1);

  for (let i = ilkIndex + 1; i < dizi.length; i++) {
    if (!Number.isFinite(dizi[i])) continue;
    onceki = dizi[i] * carpan + onceki * (1 - carpan);
    sonuc[i] = onceki;
  }
  return sonuc;
}

function sma(dizi, periyot) {
  return dizi.map((_, i) => {
    if (i < periyot - 1) return NaN;
    return ortalama(dizi.slice(i - periyot + 1, i + 1));
  });
}

function rsi(dizi, periyot = 14) {
  const sonuc = Array(dizi.length).fill(NaN);
  if (dizi.length <= periyot) return sonuc;

  let kazanc = 0;
  let kayip = 0;

  for (let i = 1; i <= periyot; i++) {
    const fark = dizi[i] - dizi[i - 1];
    if (fark > 0) kazanc += fark;
    else kayip -= fark;
  }

  let ortKazanc = kazanc / periyot;
  let ortKayip = kayip / periyot;

  sonuc[periyot] = ortKayip === 0
    ? 100
    : 100 - 100 / (1 + ortKazanc / ortKayip);

  for (let i = periyot + 1; i < dizi.length; i++) {
    const fark = dizi[i] - dizi[i - 1];
    const yeniKazanc = Math.max(fark, 0);
    const yeniKayip = Math.max(-fark, 0);

    ortKazanc = (ortKazanc * (periyot - 1) + yeniKazanc) / periyot;
    ortKayip = (ortKayip * (periyot - 1) + yeniKayip) / periyot;

    sonuc[i] = ortKayip === 0
      ? 100
      : 100 - 100 / (1 + ortKazanc / ortKayip);
  }

  return sonuc;
}

function stochastic(high, low, close, periyot = 14) {
  const sonuc = Array(close.length).fill(NaN);

  for (let i = periyot - 1; i < close.length; i++) {
    const enYuksek = Math.max(...high.slice(i - periyot + 1, i + 1));
    const enDusuk = Math.min(...low.slice(i - periyot + 1, i + 1));
    const fark = enYuksek - enDusuk;

    sonuc[i] = fark === 0
      ? 50
      : ((close[i] - enDusuk) / fark) * 100;
  }

  return sonuc;
}

function cci(high, low, close, periyot = 14) {
  const tp = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const sonuc = Array(close.length).fill(NaN);

  for (let i = periyot - 1; i < tp.length; i++) {
    const parca = tp.slice(i - periyot + 1, i + 1);
    const ort = ortalama(parca);
    const sapma = ortalama(parca.map(x => Math.abs(x - ort)));

    sonuc[i] = sapma === 0 ? 0 : (tp[i] - ort) / (0.015 * sapma);
  }

  return sonuc;
}

function williamsR(high, low, close, periyot = 14) {
  const sonuc = Array(close.length).fill(NaN);

  for (let i = periyot - 1; i < close.length; i++) {
    const enYuksek = Math.max(...high.slice(i - periyot + 1, i + 1));
    const enDusuk = Math.min(...low.slice(i - periyot + 1, i + 1));
    const fark = enYuksek - enDusuk;

    sonuc[i] = fark === 0
      ? -50
      : ((enYuksek - close[i]) / fark) * -100;
  }

  return sonuc;
}

function momentum(close, periyot = 14) {
  return close.map((fiyat, i) =>
    i < periyot ? NaN : fiyat - close[i - periyot]
  );
}

function mfi(high, low, close, volume, periyot = 14) {
  const sonuc = Array(close.length).fill(NaN);
  const tipik = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const paraAkisi = tipik.map((t, i) => t * (volume[i] || 0));

  for (let i = periyot; i < close.length; i++) {
    let pozitif = 0;
    let negatif = 0;

    for (let j = i - periyot + 1; j <= i; j++) {
      if (tipik[j] > tipik[j - 1]) pozitif += paraAkisi[j];
      else if (tipik[j] < tipik[j - 1]) negatif += paraAkisi[j];
    }

    if (negatif === 0 && pozitif === 0) sonuc[i] = 50;
    else if (negatif === 0) sonuc[i] = 100;
    else sonuc[i] = 100 - 100 / (1 + pozitif / negatif);
  }

  return sonuc;
}

function ultimateOscillator(high, low, close) {
  const sonuc = Array(close.length).fill(NaN);
  const bp = Array(close.length).fill(0);
  const tr = Array(close.length).fill(0);

  for (let i = 1; i < close.length; i++) {
    const oncekiClose = close[i - 1];
    const gercekDusuk = Math.min(low[i], oncekiClose);
    const gercekYuksek = Math.max(high[i], oncekiClose);

    bp[i] = close[i] - gercekDusuk;
    tr[i] = gercekYuksek - gercekDusuk;
  }

  for (let i = 28; i < close.length; i++) {
    function oran(periyot) {
      let toplamBP = 0;
      let toplamTR = 0;

      for (let j = i - periyot + 1; j <= i; j++) {
        toplamBP += bp[j];
        toplamTR += tr[j];
      }

      return toplamTR === 0 ? 0.5 : toplamBP / toplamTR;
    }

    sonuc[i] = 100 * (
      4 * oran(7) + 2 * oran(14) + oran(28)
    ) / 7;
  }

  return sonuc;
}

function tkeHesapla(high, low, close, volume) {
  const rsiDeger = rsi(close, 14);
  const stochDeger = ema(stochastic(high, low, close, 14), 6);
  const mfiDeger = mfi(high, low, close, volume, 14);
  const cciDeger = cci(high, low, close, 14);
  const williamsDeger = williamsR(high, low, close, 14);
  const momentumDeger = momentum(close, 14);
  const ultimateDeger = ultimateOscillator(high, low, close);

  const tke = close.map((_, i) => {
    const degerler = [
      rsiDeger[i],
      stochDeger[i],
      mfiDeger[i],
      cciDeger[i],
      williamsDeger[i],
      momentumDeger[i],
      ultimateDeger[i]
    ];

    return degerler.every(Number.isFinite)
      ? ortalama(degerler)
      : NaN;
  });

  return {
    tke,
    tkeEma: ema(tke, TKE_EMA_PERIYODU)
  };
}

function yukariKesisim(a, b, bakis = KESISIM_BAKIS) {
  const baslangic = Math.max(1, a.length - bakis);

  for (let i = a.length - 1; i >= baslangic; i--) {
    if (
      Number.isFinite(a[i - 1]) &&
      Number.isFinite(b[i - 1]) &&
      Number.isFinite(a[i]) &&
      Number.isFinite(b[i]) &&
      a[i - 1] <= b[i - 1] &&
      a[i] > b[i]
    ) return true;
  }

  return false;
}

function sifirYukariKesisim(dizi, bakis = KESISIM_BAKIS) {
  const baslangic = Math.max(1, dizi.length - bakis);

  for (let i = dizi.length - 1; i >= baslangic; i--) {
    if (
      Number.isFinite(dizi[i - 1]) &&
      Number.isFinite(dizi[i]) &&
      dizi[i - 1] <= 0 &&
      dizi[i] > 0
    ) return true;
  }

  return false;
}

function seviyeYukariKesisim(dizi, seviye, bakis = KESISIM_BAKIS) {
  const baslangic = Math.max(1, dizi.length - bakis);

  for (let i = dizi.length - 1; i >= baslangic; i--) {
    if (
      Number.isFinite(dizi[i - 1]) &&
      Number.isFinite(dizi[i]) &&
      dizi[i - 1] <= seviye &&
      dizi[i] > seviye
    ) return true;
  }

  return false;
}

function formatFiyat(deger) {
  return Number.isFinite(deger)
    ? deger.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : "-";
}

function formatOran(deger) {
  return Number.isFinite(deger)
    ? deger.toFixed(2) + "x"
    : "-";
}

async function hisseAnaliz(sembol) {
  const yahooSembol = sembol + ".IS";
  const url =
    "https://proxy.cors.dev/https://query1.finance.yahoo.com/v8/finance/chart/" +
    yahooSembol +
    "?range=" + VERI_ARALIGI + "&interval=1h";

  const cevap = await fetch(url);

  if (!cevap.ok) {
    throw new Error("Yahoo veri isteği başarısız: " + cevap.status);
  }

  const json = await cevap.json();
  const sonuc = json?.chart?.result?.[0];

  if (!sonuc || !sonuc.timestamp?.length) {
    throw new Error("Yahoo verisi bulunamadı");
  }

  const meta = sonuc.meta || {};
  const q = sonuc.indicators?.quote?.[0];

  if (!q) throw new Error("Mum verileri bulunamadı");

  const simdi = Math.floor(Date.now() / 1000);
  const hamMumlar = [];

  for (let i = 0; i < sonuc.timestamp.length; i++) {
    const zaman = sonuc.timestamp[i];
    const acilis = q.open?.[i];
    const yuksek = q.high?.[i];
    const dusuk = q.low?.[i];
    const kapanis = q.close?.[i];
    const hacim = q.volume?.[i];

    if (
      !Number.isFinite(acilis) ||
      !Number.isFinite(yuksek) ||
      !Number.isFinite(dusuk) ||
      !Number.isFinite(kapanis)
    ) continue;

    hamMumlar.push({
      zaman,
      open: acilis,
      high: yuksek,
      low: dusuk,
      close: kapanis,
      volume: Number.isFinite(hacim) ? hacim : 0
    });
  }

  // Sinyaller yalnızca kapanmış saatlik mumlarla hesaplanır.
  const mumlar = hamMumlar.filter(m => m.zaman + PERIYOT <= simdi);

  if (mumlar.length < 40) {
    throw new Error("Yeterli kapanmış saatlik mum yok: " + mumlar.length);
  }

  const close = mumlar.map(m => m.close);
  const high = mumlar.map(m => m.high);
  const low = mumlar.map(m => m.low);
  const volume = mumlar.map(m => m.volume);

  const ema8 = ema(close, 8);
  const ema20 = ema(close, 20);

  const { tke, tkeEma } = tkeHesapla(high, low, close, volume);

  const son = mumlar.length - 1;
  const sonMum = mumlar[son];

  const sonTke = tke[son];
  const oncekiTke = tke[son - 1];

  const tkeYon =
    Number.isFinite(sonTke) && Number.isFinite(oncekiTke)
      ? sonTke > oncekiTke ? "YUKARI" : sonTke < oncekiTke ? "AŞAĞI" : "YATAY"
      : "HESAPLANAMADI";

  const emaKesim = yukariKesisim(ema8, ema20);
  const tkeSifirYukariKesisim = sifirYukariKesisim(tke);
  const tke20Kesisim = seviyeYukariKesisim(tke, 20);

  // Ana sinyal: EMA8/20 yukarı kesişimi VE TKE sıfır yukarı kesişimi.
  const anaSinyal = emaKesim && tkeSifirYukariKesisim;

  const sonHacim = sonMum.volume;
  const oncekiHacimler = volume.slice(Math.max(0, son - 20), son);
  const ortHacim = ortalama(oncekiHacimler.filter(v => v > 0));

  const hacimOrani =
    sonHacim > 0 && Number.isFinite(ortHacim) && ortHacim > 0
      ? sonHacim / ortHacim
      : NaN;

  const canliFiyat =
    Number(meta.regularMarketPrice) ||
    Number(q.close?.[q.close.length - 1]) ||
    sonMum.close;

  const sonHamZaman = hamMumlar[hamMumlar.length - 1]?.zaman;
  const piyasaZamani = Number(meta.regularMarketTime) || NaN;

  return {
    sembol,
    kapanis: sonMum.close,
    canliFiyat,
    ema8: ema8[son],
    ema20: ema20[son],
    emaDurum: ema8[son] > ema20[son] ? "EMA8 ÜSTTE" : "EMA8 ALTTA",
    fiyatEma20Ustu: sonMum.close > ema20[son],
    tke: sonTke,
    tkeEma: tkeEma[son],
    tkeYon,
    tkeSifirYukariKesisim,
    tke20Kesisim,
    emaKesim,
    anaSinyal,
    hacim: sonHacim,
    hacimOrani,
    sonMumZamani: sonMum.zaman,
    mumKapanisZamani: sonMum.zaman + PERIYOT,
    sonHamZaman,
    hamVeriYasi: sonHamZaman ? (simdi - sonHamZaman) / 60 : NaN,
    piyasaZamani,
    piyasaVeriYasi: piyasaZamani ? (simdi - piyasaZamani) / 60 : NaN,
    hamMumSayisi: hamMumlar.length,
    kapanmisMumSayisi: mumlar.length
  };
}

async function bistTarama() {
  const durum = document.querySelector(".status");
  const liste = document.querySelector("#hisse-listesi");

  if (durum) durum.textContent = "Tarama yapılıyor...";
  if (liste) liste.innerHTML = "";

  const sonuclar = [];
  const hatalar = [];

  for (const sembol of hisseler) {
    try {
      const veri = await hisseAnaliz(sembol);
      sonuclar.push(veri);
    } catch (hata) {
      hatalar.push(sembol + ": " + hata.message);
    }
  }

  const sinyalSayisi = sonuclar.filter(x => x.anaSinyal).length;

  const taramaSaati = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul"
  });

  let metin =
    "## Tarama Durumu\n" +
    "1 saatlik tarama tamamlandı!\n" +
    "Kontrol edilen hisse: " + hisseler.length +
    " | Başarılı analiz: " + sonuclar.length +
    " | Ana sinyal: " + sinyalSayisi +
    " | Tarama saati: " + taramaSaati + "\n\n";

  for (const x of sonuclar) {
    metin +=
      x.sembol +
      " | Kapanmış fiyat: " + formatFiyat(x.kapanis) +
      " | Canlı fiyat: " + formatFiyat(x.canliFiyat) +
      " | EMA8: " + formatFiyat(x.ema8) +
      " | EMA20: " + formatFiyat(x.ema20) +
      " | EMA durumu: " + x.emaDurum +
      " | TKE: " + formatFiyat(x.tke) +
      " | TKE EMA: " + formatFiyat(x.tkeEma) +
      " | TKE yön: " + x.tkeYon +
      " | TKE sıfır yukarı kesim: " + (x.tkeSifirYukariKesisim ? "EVET" : "Hayır") +
      " | TKE 20 kesim: " + (x.tke20Kesisim ? "EVET" : "Hayır") +
      " | EMA kesim: " + (x.emaKesim ? "EVET" : "Hayır") +
      " | Fiyat EMA20 üstü: " + (x.fiyatEma20Ustu ? "EVET" : "Hayır") +
      " | Hacim: " + (x.hacim > 0 ? x.hacim.toLocaleString("tr-TR") : "YOK/SIFIR") +
      " | Hacim/Ort.: " + formatOran(x.hacimOrani) +
      " | Ana sinyal: " + (x.anaSinyal ? "EVET" : "YOK") +
      " | Son kapanmış mum: " + istanbulZaman(x.sonMumZamani) +
      " | Mum kapanış zamanı: " + istanbulZaman(x.mumKapanisZamani) +
      " | Yahoo son ham mum: " + istanbulZaman(x.sonHamZaman) +
      " | Ham veri yaşı: " + formatFiyat(x.hamVeriYasi) + " dk" +
      " | Piyasa veri zamanı: " + istanbulZaman(x.piyasaZamani) +
      " | Piyasa veri yaşı: " + formatFiyat(x.piyasaVeriYasi) + " dk" +
      " | Ham mum: " + x.hamMumSayisi +
      " | Kapanmış mum: " + x.kapanmisMumSayisi +
      "\n\n";
  }

  if (hatalar.length) {
    metin += "### Analiz Hataları\n" + hatalar.join("\n");
  }

  if (durum) durum.textContent = metin;

  if (liste) {
    liste.textContent = metin;
  }

  console.log(metin);
  return sonuclar;
}

// Tarama fonksiyonunu dışarıdan çalıştırabilmek için:
window.bistTarama = bistTarama;
window.hisseAnaliz = hisseAnaliz;
