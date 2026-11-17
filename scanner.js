const hisseler = [
  "AEFES", "AGHOL", "AHGAZ", "AKBNK", "AKCNS",
  "AKFYE", "AKSA", "AKSEN", "ALARK", "ALBRK",
  "ALTNY", "ANHYT", "ANSGR", "ARCLK", "ASELS",
  "ASTOR", "AYGAZ", "BERA", "BIMAS", "BINHO",
  "BRSAN", "BRYAT", "BTCIM", "CANTE", "CCOLA",
  "CIMSA", "CVKMD", "CWENE", "DOAS", "DOHOL",
  "ECILC", "ECZYT", "EGEEN", "EGGUB", "EKGYO",
  "ENERY", "ENJSA", "ENKAI", "ENTRA", "EREGL",
  "EUREN", "FENER", "FROTO", "GARAN", "GLRMK",
  "GLYHO", "GRSEL", "GUBRF", "GWIND", "HALKB",
  "HEKTS", "ISCTR", "ISDMR", "ISMEN", "KARSN",
  "KATMR", "KCAER", "KCHOL", "KORDS", "KRDMD",
  "LMKDC", "MAVI", "MGROS", "MPARK", "OBAMS",
  "ODAS", "OTKAR", "OYAKC", "PAHOL", "PETKM",
  "PGSUS", "RGYAS", "RYSAS", "SAHOL", "SASA",
  "SISE", "SNGYO", "SOKM", "TABGD", "TAVHL",
  "TCELL", "TCKRC", "THYAO", "TKFEN", "TOASO",
  "TRALT", "TRENJ", "TRGYO", "TRMET", "TSKB",
  "TTKOM", "TTRAK", "TUKAS", "TUPRS", "TURSG",
  "ULKER", "VAKBN", "VESTL", "YKBNK", "ZOREN"
];

const PERIYOT = 3600;
const KESISIM_BAKIS = 3;
const TKE_EMA_PERIYODU = 5;
const VERI_ARALIGI = "3mo";
const GRUP_BOYUTU = 5;
const GRUP_BEKLEME = 700;
const TAM_BIST_CSV = "https://proxy.cors.dev/https://bistsirketleri.com/wp-content/themes/bistsirketleri/assets/downloads/borsa-hisseleri-listesi.csv";

function csvSatirlaraAyir(metin) {
  const satirlar = [];
  let satir = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (c === '"' && metin[i + 1] === '"' && tirnak) { alan += '"'; i++; }
    else if (c === '"') tirnak = !tirnak;
    else if ((c === ',' || c === ';' || c === '\t') && !tirnak) { satir.push(alan.trim()); alan = ""; }
    else if ((c === '\n' || c === '\r') && !tirnak) {
      if (alan.trim() || satir.length) { satir.push(alan.trim()); satirlar.push(satir); }
      satir = []; alan = "";
    } else alan += c;
  }
  if (alan.trim() || satir.length) { satir.push(alan.trim()); satirlar.push(satir); }
  return satirlar;
}

async function bistTumPaylariGetir() {
  const cevap = await fetch(TAM_BIST_CSV + "?_=" + Date.now(), { cache: "no-store" });
  if (!cevap.ok) throw new Error("BIST pay listesi indirilemedi: " + cevap.status);
  const satirlar = csvSatirlaraAyir(await cevap.text());
  const kodlar = [];
  for (const satir of satirlar) {
    const kod = (satir.find(x => /^[A-Z0-9]{3,6}$/.test(x)) || "").toUpperCase();
    if (!kod || kod === "SIRA" || kod === "KOD" || kod === "PAY") continue;
    const ad = satir.join(" ").toLocaleUpperCase("tr-TR");
    // BYF/fon/varant/sertifika kodları pay senedi taramasına alınmaz.
    if (/BORSA YATIRIM FONU|\bBYF\b|PORTFOY|PORTFÖY|VARANT|SERTIFIKA|SERTİFİKA|FON ADI/.test(ad)) continue;
    if (!kodlar.includes(kod)) kodlar.push(kod);
  }
  if (kodlar.length < 300) throw new Error("İndirilen listede yeterli pay kodu bulunamadı: " + kodlar.length);
  return kodlar.sort();
}

function dortSaatlikGrupla(mumlar) {
  const gruplar = new Map();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  });
  for (const m of mumlar) {
    const parca = Object.fromEntries(fmt.formatToParts(new Date(m.zaman * 1000)).map(p => [p.type, p.value]));
    const saat = Number(parca.hour);
    if (saat < 10 || saat >= 18) continue;
    const bas = saat < 14 ? 10 : 14;
    const anahtar = parca.year + parca.month + parca.day + "-" + bas;
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar).push(m);
  }
  const sonuc = [];
  for (const [anahtar, grup] of gruplar) {
    grup.sort((a,b) => a.zaman-b.zaman);
    if (grup.length < 4) continue;
    const ilk = grup[0], son = grup[grup.length-1];
    sonuc.push({ zaman: ilk.zaman, open: ilk.open, high: Math.max(...grup.map(x=>x.high)), low: Math.min(...grup.map(x=>x.low)), close: son.close, volume: grup.every(x=>Number.isFinite(x.volume)) ? grup.reduce((a,x)=>a+x.volume,0) : NaN });
  }
  return sonuc;
}

function istanbulZaman(timestamp) {
  if (!Number.isFinite(timestamp)) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(timestamp * 1000));
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
  return Number.isFinite(deger) ? deger.toFixed(2) + "x" : "-";
}

function formatHacim(deger) {
  return Number.isFinite(deger)
    ? deger.toLocaleString("tr-TR")
    : "VERİ YOK";
}

function ortalama(dizi) {
  const gecerli = dizi.filter(Number.isFinite);
  return gecerli.length
    ? gecerli.reduce((a, b) => a + b, 0) / gecerli.length
    : NaN;
}

function ema(dizi, periyot) {
  const sonuc = Array(dizi.length).fill(NaN);
  const ilk = dizi.findIndex(Number.isFinite);
  if (ilk < 0 || dizi.length - ilk < periyot) return sonuc;

  let onceki = ortalama(dizi.slice(ilk, ilk + periyot));
  if (!Number.isFinite(onceki)) return sonuc;

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

function rsi(dizi, periyot = 14) {
  const sonuc = Array(dizi.length).fill(NaN);
  if (dizi.length <= periyot) return sonuc;

  let kazanc = 0, kayip = 0;
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
    ortKazanc =
      (ortKazanc * (periyot - 1) + Math.max(fark, 0)) / periyot;
    ortKayip =
      (ortKayip * (periyot - 1) + Math.max(-fark, 0)) / periyot;
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
    sonuc[i] = fark === 0 ? 50 : ((close[i] - enDusuk) / fark) * 100;
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
  const paraAkisi = tipik.map((t, i) =>
    Number.isFinite(volume[i]) && volume[i] >= 0
      ? t * volume[i]
      : NaN
  );

  for (let i = periyot; i < close.length; i++) {
    let pozitif = 0, negatif = 0, veriEksik = false;

    for (let j = i - periyot + 1; j <= i; j++) {
      if (!Number.isFinite(volume[j]) ||
          !Number.isFinite(paraAkisi[j])) {
        veriEksik = true;
        break;
      }
      if (tipik[j] > tipik[j - 1]) pozitif += paraAkisi[j];
      else if (tipik[j] < tipik[j - 1]) negatif += paraAkisi[j];
    }

    if (veriEksik || pozitif + negatif === 0) continue;
    sonuc[i] = negatif === 0
      ? 100
      : 100 - 100 / (1 + pozitif / negatif);
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
      let toplamBP = 0, toplamTR = 0;
      for (let j = i - periyot + 1; j <= i; j++) {
        toplamBP += bp[j];
        toplamTR += tr[j];
      }
      return toplamTR === 0 ? 0.5 : toplamBP / toplamTR;
    }
    sonuc[i] = 100 * (4 * oran(7) + 2 * oran(14) + oran(28)) / 7;
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
      rsiDeger[i], stochDeger[i], mfiDeger[i], cciDeger[i],
      williamsDeger[i], momentumDeger[i], ultimateDeger[i]
    ];
    return degerler.every(Number.isFinite)
      ? ortalama(degerler)
      : NaN;
  });

  return {
    tke,
    tkeEma: ema(tke, TKE_EMA_PERIYODU),
    mfi: mfiDeger
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

// EMA8/EMA20 ve TKE sifir kesişimi ayni kapanmis mumda olmali.
function ayniMumAnaSinyal(ema8, ema20, tke, bakis = KESISIM_BAKIS) {
  const baslangic = Math.max(1, ema8.length - bakis);
  for (let i = ema8.length - 1; i >= baslangic; i--) {
    const emaKesti =
      Number.isFinite(ema8[i - 1]) &&
      Number.isFinite(ema20[i - 1]) &&
      Number.isFinite(ema8[i]) &&
      Number.isFinite(ema20[i]) &&
      ema8[i - 1] <= ema20[i - 1] &&
      ema8[i] > ema20[i];

    const tkeKesti =
      Number.isFinite(tke[i - 1]) &&
      Number.isFinite(tke[i]) &&
      tke[i - 1] <= 0 &&
      tke[i] > 0;

    if (emaKesti && tkeKesti) return i;
  }
  return -1;
}

async function hisseAnaliz(sembol) {
  const yahooSembol = sembol + ".IS";
  const url =
    "https://proxy.cors.dev/https://query1.finance.yahoo.com/v8/finance/chart/" +
    yahooSembol +
    "?range=" + VERI_ARALIGI +
    "&interval=1h&includePrePost=false&_=" + Date.now();

  const cevap = await fetch(url, { cache: "no-store" });
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
      volume: Number.isFinite(hacim) ? hacim : NaN
    });
  }

  // Tamamlanmamis saatlik mumlar hesaba katilmaz.
  const mumlar = hamMumlar.filter(
    m => m.zaman + PERIYOT <= simdi
  );

  if (mumlar.length < 40) {
    throw new Error("Yeterli kapanmış saatlik mum yok: " + mumlar.length);
  }

  const close = mumlar.map(m => m.close);
  const high = mumlar.map(m => m.high);
  const low = mumlar.map(m => m.low);
  const volume = mumlar.map(m => m.volume);

  const ema8 = ema(close, 8);
  const ema20 = ema(close, 20);
  const { tke, tkeEma, mfi: mfiDeger } =
    tkeHesapla(high, low, close, volume);

  const son = mumlar.length - 1;
  const sonMum = mumlar[son];
  const sonTke = tke[son];
  const oncekiTke = tke[son - 1];

  const tkeYon =
    Number.isFinite(sonTke) && Number.isFinite(oncekiTke)
      ? sonTke > oncekiTke ? "YUKARI"
        : sonTke < oncekiTke ? "AŞAĞI" : "YATAY"
      : "HESAPLANAMADI";

  const emaKesim = yukariKesisim(ema8, ema20);
  const tkeSifirYukariKesisim = sifirYukariKesisim(tke);
  const tke20Kesisim = seviyeYukariKesisim(tke, 20);
  const anaSinyalMumIndex = ayniMumAnaSinyal(ema8, ema20, tke);
  const anaSinyal = anaSinyalMumIndex >= 0;

  const sonHacim = sonMum.volume;
  const oncekiHacimler = volume.slice(Math.max(0, son - 20), son);
  const gecerliHacimler = oncekiHacimler.filter(
    v => Number.isFinite(v) && v > 0
  );
  const ortHacim = ortalama(gecerliHacimler);

  const hacimOrani =
    Number.isFinite(sonHacim) &&
    sonHacim > 0 &&
    Number.isFinite(ortHacim) &&
    ortHacim > 0
      ? sonHacim / ortHacim
      : NaN;

  const canliFiyat =
    Number.isFinite(meta.regularMarketPrice) &&
    meta.regularMarketPrice > 0
      ? meta.regularMarketPrice
      : sonMum.close;

  const sonHamZaman = hamMumlar[hamMumlar.length - 1]?.zaman;
  const piyasaZamani = Number.isFinite(meta.regularMarketTime)
    ? meta.regularMarketTime
    : NaN;

  const hacimDoluMumSayisi = mumlar.filter(
    m => Number.isFinite(m.volume) && m.volume > 0
  ).length;

  const son14Mum = mumlar.slice(-14);
  const son14HacimEksik = son14Mum.filter(
    m => !Number.isFinite(m.volume)
  ).length;

  const mfiDurumu = Number.isFinite(mfiDeger[son])
    ? "GEÇERLİ"
    : "HACİM VERİSİ EKSİK VEYA İŞLEM YOK";

  const tkeDurumu = Number.isFinite(sonTke)
    ? "GEÇERLİ"
    : "HESAPLANAMADI";

  const mumlar4s = dortSaatlikGrupla(mumlar);
  let teyit4s = "VERİ YETERSİZ";
  let ema84s = NaN, ema204s = NaN, tke4s = NaN, tkeYon4s = "-", fiyat4sUstu = false;
  if (mumlar4s.length >= 40) {
    const c4 = mumlar4s.map(m=>m.close), h4=mumlar4s.map(m=>m.high), l4=mumlar4s.map(m=>m.low), v4=mumlar4s.map(m=>m.volume);
    const e84=ema(c4,8), e204=ema(c4,20), t4=tkeHesapla(h4,l4,c4,v4).tke;
    const z=mumlar4s.length-1;
    ema84s=e84[z]; ema204s=e204[z]; tke4s=t4[z];
    tkeYon4s=Number.isFinite(t4[z]) && Number.isFinite(t4[z-1]) ? (t4[z]>t4[z-1] ? "YUKARI" : t4[z]<t4[z-1] ? "AŞAĞI" : "YATAY") : "-";
    fiyat4sUstu=c4[z]>e204[z];
    const olumlu=ema84s>ema204s && fiyat4sUstu && tke4s>20 && tkeYon4s==="YUKARI";
    const kismen= (ema84s>ema204s?1:0)+(fiyat4sUstu?1:0)+(tke4s>20?1:0)+(tkeYon4s==="YUKARI"?1:0);
    teyit4s=olumlu ? "TAMAM" : kismen>=2 ? "BEKLİYOR" : "ZAYIF";
  }

  return {
    sembol,
    kapanis: sonMum.close,
    canliFiyat,
    ema8: ema8[son],
    ema20: ema20[son],
    emaDurum:
      ema8[son] > ema20[son] ? "EMA8 ÜSTTE" : "EMA8 ALTTA",
    fiyatEma20Ustu: sonMum.close > ema20[son],
    tke: sonTke,
    tkeEma: tkeEma[son],
    tkeYon,
    tkeDurumu,
    mfiDurumu,
    tkeSifirYukariKesisim,
    tke20Kesisim,
    emaKesim,
    anaSinyal,
    anaSinyalZamani: anaSinyal
      ? mumlar[anaSinyalMumIndex].zaman
      : NaN,
    hacim: sonHacim,
    hacimOrani,
    hacimDoluMumSayisi,
    son14HacimEksik,
    sonMumZamani: sonMum.zaman,
    sonHamZaman,
    hamVeriYasi: Number.isFinite(sonHamZaman)
      ? (simdi - sonHamZaman) / 60
      : NaN,
    piyasaZamani,
    piyasaVeriYasi: Number.isFinite(piyasaZamani)
      ? (simdi - piyasaZamani) / 60
      : NaN,
    hamMumSayisi: hamMumlar.length,
    kapanmisMumSayisi: mumlar.length,
    mumSayisi4s: mumlar4s.length,
    teyit4s, ema84s, ema204s, tke4s, tkeYon4s, fiyat4sUstu
  };
}

// Son mumdaki kosullara gore siniflandirma.
// Ana sinyal ayri tutulur; gecmis kesişim tek basina guclu aday yapmaz.
function siniflandir(x) {
  if (x.anaSinyal) return "ANA SİNYAL";

  const kosullar = [
    Number.isFinite(x.ema8) &&
      Number.isFinite(x.ema20) && x.ema8 > x.ema20,
    x.fiyatEma20Ustu === true,
    x.tkeYon === "YUKARI",
    Number.isFinite(x.tke) && x.tke > 0,
    x.mfiDurumu === "GEÇERLİ",
    Number.isFinite(x.hacimOrani) && x.hacimOrani >= 1
  ];

  const puan = kosullar.filter(Boolean).length;

  if (kosullar.every(Boolean)) return "GÜÇLÜ ADAY";
  if (puan >= 3) return "TAKİP LİSTESİ";
  return "ZAYIF";
}

function anaSinyalSatiri(x) {
  return (
    x.sembol +
    " | EMA: " + x.emaDurum +
    " | Fiyat EMA20: " + (x.fiyatEma20Ustu ? "ÜSTÜNDE" : "ALTINDA") +
    " | TKE: " + formatFiyat(x.tke) + " (" + x.tkeYon + ")" +
    " | Sinyal mumu: " + istanbulZaman(x.anaSinyalZamani) +
    "\n"
  );
}

function gucluAdaySatiri(x) {
  return (
    x.sembol +
    " | Kapanış: " + formatFiyat(x.kapanis) +
    " | EMA8/20: " + x.emaDurum +
    " | TKE: " + formatFiyat(x.tke) + " (" + x.tkeYon + ")" +
    " | Hacim: " + formatOran(x.hacimOrani) +
    "\n"
  );
}

async function bistTarama() {
  const liste = document.querySelector("#hisse-listesi");
  const buton = document.querySelector("#tarama-butonu");

  if (window.taramaDevamEdiyor) return;
  window.taramaDevamEdiyor = true;

  if (buton) {
    buton.disabled = true;
    buton.textContent = "TARAMA YAPILIYOR...";
  }

  const sonuclar = [];
  const hatalar = [];
  let taramaListesi = hisseler.slice();
  let listeKaynakNotu = "YEDEK 100 HİSSELİK LİSTE";
  try {
    taramaListesi = await bistTumPaylariGetir();
    listeKaynakNotu = "GÜNCEL TÜM PAY LİSTESİ";
  } catch (e) {
    if (liste) liste.textContent = "TÜM BIST LİSTESİ ALINAMADI\n" + e.message + "\nGüvenli tarafta kalmak için tarama durduruldu. Eski 100 hisseye otomatik düşülmedi.";
    window.taramaDevamEdiyor = false;
    if (buton) { buton.disabled = false; buton.textContent = "TARAMAYI BAŞLAT"; }
    return;
  }
  const toplamHisse = taramaListesi.length;
  const toplamGrup = Math.ceil(toplamHisse / GRUP_BOYUTU);
  const bekle = ms => new Promise(resolve => setTimeout(resolve, ms));

  try {
    for (
      let baslangic = 0;
      baslangic < toplamHisse;
      baslangic += GRUP_BOYUTU
    ) {
      const grup = taramaListesi.slice(
        baslangic,
        baslangic + GRUP_BOYUTU
      );
      const grupNo = Math.floor(baslangic / GRUP_BOYUTU) + 1;

      if (liste) {
        liste.textContent =
          "BIST TARAMASI DEVAM EDİYOR\n\n" +
          "Tamamlanan grup: " + (grupNo - 1) + " / " + toplamGrup +
          "\nKontrol edilen hisse: " +
          (sonuclar.length + hatalar.length) + " / " + toplamHisse +
          "\nBaşarılı analiz: " + sonuclar.length +
          "\nHata sayısı: " + hatalar.length +
          "\n\nŞu an taranan grup:\n" + grup.join(", ") +
          "\n\nLütfen tarama bitene kadar bekleyin.";
      }

      const grupSonuclari = await Promise.allSettled(
        grup.map(sembol => hisseAnaliz(sembol))
      );

      for (let i = 0; i < grupSonuclari.length; i++) {
        const sonuc = grupSonuclari[i];
        const sembol = grup[i];

        if (sonuc.status === "fulfilled") {
          sonuclar.push(sonuc.value);
        } else {
          const mesaj = sonuc.reason?.message ||
            String(sonuc.reason || "Bilinmeyen hata");
          hatalar.push(sembol + ": " + mesaj);
        }
      }

      if (liste) {
        liste.textContent =
          "BIST TARAMASI DEVAM EDİYOR\n\n" +
          "Tamamlanan grup: " + grupNo + " / " + toplamGrup +
          "\nKontrol edilen hisse: " +
          (sonuclar.length + hatalar.length) + " / " + toplamHisse +
          "\nBaşarılı analiz: " + sonuclar.length +
          "\nHata sayısı: " + hatalar.length +
          "\n\nSon tamamlanan grup:\n" + grup.join(", ") +
          "\n\nSonraki grup hazırlanıyor...";
      }

      if (baslangic + GRUP_BOYUTU < toplamHisse) {
        await bekle(GRUP_BEKLEME);
      }
    }

    const anaSinyaller = sonuclar.filter(
      x => siniflandir(x) === "ANA SİNYAL"
    );
    const gucluAdaylar = sonuclar.filter(
      x => siniflandir(x) === "GÜÇLÜ ADAY"
    );
    const takipListesi = sonuclar.filter(
      x => siniflandir(x) === "TAKİP LİSTESİ"
    );
    const zayifHisseler = sonuclar.filter(
      x => siniflandir(x) === "ZAYIF"
    );
    const teyitTamam = sonuclar.filter(x => x.teyit4s === "TAMAM");
    const teyitBekleyen = sonuclar.filter(x => x.teyit4s === "BEKLİYOR");
    const teyitZayif = sonuclar.filter(x => x.teyit4s === "ZAYIF");
    const teyitVeriYok = sonuclar.filter(x => x.teyit4s === "VERİ YETERSİZ");

    const taramaSaati = new Date().toLocaleString(
      "tr-TR",
      { timeZone: "Europe/Istanbul", hour12: false }
    );

    const enEskiVeriYasi = sonuclar.length
      ? Math.max(...sonuclar.map(x => x.hamVeriYasi).filter(Number.isFinite))
      : NaN;

    let metin =
      "BIST TÜM PAYLAR TARAMA RAPORU\n" +
      "==============================\n" +
      "Tarama: " + taramaSaati + "\n" +
      "Kontrol: " + (sonuclar.length + hatalar.length) + " / " + toplamHisse +
      " | Başarılı: " + sonuclar.length +
      " | Hata: " + hatalar.length + "\n" +
      "Liste: " + listeKaynakNotu + " | Gruplar: " + toplamGrup + " / " + toplamGrup +
      (Number.isFinite(enEskiVeriYasi)
        ? " | En eski Yahoo verisi: " + formatFiyat(enEskiVeriYasi) + " dk"
        : "") +
      "\n\n";

    metin +=
      "1. ANA SİNYAL (" + anaSinyaller.length + ")\n" +
      "------------------------------\n";

    if (anaSinyaller.length) {
      for (const x of anaSinyaller) {
        metin += anaSinyalSatiri(x);
        metin +=
          "   UYARI: Kesişim son 3 kapanmış mum içinde oluşmuş olabilir. " +
          "Güncel görünüm zayıfsa bu tek başına alım sinyali değildir.\n";
      }
    } else {
      metin += "Ana sinyal yok.\n";
    }

    metin +=
      "\n2. GÜÇLÜ ADAYLAR (" + gucluAdaylar.length + ")\n" +
      "------------------------------\n";

    if (gucluAdaylar.length) {
      for (const x of gucluAdaylar) {
        metin += gucluAdaySatiri(x);
      }
    } else {
      metin += "Tüm güçlü aday koşullarını sağlayan hisse yok.\n";
    }

    metin +=
      "\n3. TAKİP LİSTESİ (" + takipListesi.length + ")\n" +
      "------------------------------\n";
    metin += takipListesi.length
      ? takipListesi.map(x => x.sembol).join(", ") + "\n"
      : "Takip hissesi yok.\n";

    metin +=
      "\n4. ZAYIF HİSSELER (" + zayifHisseler.length + ")\n" +
      "------------------------------\n";
    metin += zayifHisseler.length
      ? zayifHisseler.map(x => x.sembol).join(", ") + "\n"
      : "Zayıf hisse yok.\n";

    metin +=
      "\n5. 4 SAATLİK TEYİT\n" +
      "------------------------------\n" +
      "TEYİT TAMAM (" + teyitTamam.length + "): " + (teyitTamam.map(x=>x.sembol).join(", ") || "Yok") + "\n" +
      "TEYİT BEKLİYOR (" + teyitBekleyen.length + "): " + (teyitBekleyen.map(x=>x.sembol).join(", ") || "Yok") + "\n" +
      "ZAYIF (" + teyitZayif.length + "): " + (teyitZayif.map(x=>x.sembol).join(", ") || "Yok") + "\n" +
      "4S VERİ YETERSİZ: " + teyitVeriYok.length + "\n";

    if (hatalar.length) {
      metin +=
        "\nANALİZ HATALARI (" + hatalar.length + ")\n" +
        "------------------------------\n" +
        hatalar.join("\n") + "\n";
    }

    if (sonuclar.length === 0) {
      metin +=
        "\nHiçbir hisse analiz edilemedi. Veri bağlantısını kontrol edin.\n";
    }

    metin +=
      "\n==============================\n" +
      "NOT: Bu liste teknik ön elemedir, alım-satım talimatı değildir.\n" +
      "4 saatlik teyit saatlik mumlardan oluşturulmuştur; teyit tamamı da alım talimatı değildir.\n" +
      "Yahoo Finance verileri gecikmeli olabilir.\n";

    if (liste) liste.textContent = metin;
    console.log(metin);
    return sonuclar;

  } finally {
    window.taramaDevamEdiyor = false;
    if (buton) {
      buton.disabled = false;
      buton.textContent = "TARAMAYI BAŞLAT";
    }
  }
}

window.bistTarama = bistTarama;
window.hisseAnaliz = hisseAnaliz;
