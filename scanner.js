
const hisseler = [
  "AEFES","AGHOL","AHGAZ","AKBNK","AKCNS","AKFYE","AKSA","AKSEN","ALARK","ALBRK",
  "ALTNY","ANHYT","ANSGR","ARCLK","ASELS","ASTOR","AYGAZ","BERA","BIMAS","BINHO",
  "BRSAN","BRYAT","BTCIM","CANTE","CCOLA","CIMSA","CVKMD","CWENE","DOAS","DOHOL",
  "ECILC","ECZYT","EGEEN","EGGUB","EKGYO","ENERY","ENJSA","ENKAI","ENTRA","EREGL",
  "EUREN","FENER","FROTO","GARAN","GLRMK","GLYHO","GRSEL","GUBRF","GWIND","HALKB",
  "HEKTS","ISCTR","ISDMR","ISMEN","KARSN","KATMR","KCAER","KCHOL","KORDS","KRDMD",
  "LMKDC","MAVI","MGROS","MPARK","OBAMS","ODAS","OTKAR","OYAKC","PAHOL","PETKM",
  "PGSUS","RGYAS","RYSAS","SAHOL","SASA","SISE","SNGYO","SOKM","TABGD","TAVHL",
  "TCELL","TCKRC","THYAO","TKFEN","TOASO","TRALT","TRENJ","TRGYO","TRMET","TSKB",
  "TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","VAKBN","VESTL","YKBNK","ZOREN"
];

const PERIYOT = 3600;
const KESISIM_BAKIS = 3;
const TKE_EMA_PERIYODU = 5;
const VERI_ARALIGI = "3mo";
const GRUP_BOYUTU = 5;
const GRUP_BEKLEME = 700;
const TAM_BIST_SAYFA = "https://proxy.cors.dev/https://bistsirketleri.com/bist-hisseleri/";

// 7 günden eski veri işlem değerlendirmesine alınmaz.
const AZAMI_VERI_YASI_DAKIKA = 7 * 24 * 60;

function ortalama(a) {
  const v = a.filter(Number.isFinite);
  return v.length ? v.reduce((x,y)=>x+y,0)/v.length : NaN;
}

function ema(a,p) {
  const r=Array(a.length).fill(NaN);
  const ilk=a.findIndex(Number.isFinite);
  if(ilk<0 || a.length-ilk<p) return r;
  let onceki=ortalama(a.slice(ilk,ilk+p));
  const bas=ilk+p-1;
  r[bas]=onceki;
  const k=2/(p+1);
  for(let i=bas+1;i<a.length;i++){
    if(!Number.isFinite(a[i])) continue;
    onceki=a[i]*k+onceki*(1-k);
    r[i]=onceki;
  }
  return r;
}

function rsi(a,p=14) {
  const r=Array(a.length).fill(NaN);
  if(a.length<=p) return r;
  let g=0,k=0;
  for(let i=1;i<=p;i++){
    const f=a[i]-a[i-1];
    if(f>0) g+=f; else k-=f;
  }
  let ag=g/p,ak=k/p;
  r[p]=ak===0?100:100-100/(1+ag/ak);
  for(let i=p+1;i<a.length;i++){
    const f=a[i]-a[i-1];
    ag=(ag*(p-1)+Math.max(f,0))/p;
    ak=(ak*(p-1)+Math.max(-f,0))/p;
    r[i]=ak===0?100:100-100/(1+ag/ak);
  }
  return r;
}

function stochastic(h,l,c,p=14) {
  const r=Array(c.length).fill(NaN);
  for(let i=p-1;i<c.length;i++){
    const hi=Math.max(...h.slice(i-p+1,i+1));
    const lo=Math.min(...l.slice(i-p+1,i+1));
    r[i]=hi===lo?50:(c[i]-lo)/(hi-lo)*100;
  }
  return r;
}

function cci(h,l,c,p=14) {
  const tp=c.map((v,i)=>(h[i]+l[i]+v)/3);
  const r=Array(c.length).fill(NaN);
  for(let i=p-1;i<c.length;i++){
    const a=tp.slice(i-p+1,i+1);
    const m=ortalama(a);
    const s=ortalama(a.map(v=>Math.abs(v-m)));
    r[i]=s===0?0:(tp[i]-m)/(0.015*s);
  }
  return r;
}

function williamsR(h,l,c,p=14) {
  const r=Array(c.length).fill(NaN);
  for(let i=p-1;i<c.length;i++){
    const hi=Math.max(...h.slice(i-p+1,i+1));
    const lo=Math.min(...l.slice(i-p+1,i+1));
    r[i]=hi===lo?-50:(c[i]-hi)/(hi-lo)*100;
  }
  return r;
}

function mfi(h,l,c,v,p=14) {
  const r=Array(c.length).fill(NaN);
  const tp=c.map((x,i)=>(h[i]+l[i]+x)/3);
  for(let i=p;i<c.length;i++){
    let poz=0,neg=0,eksik=false;
    for(let j=i-p+1;j<=i;j++){
      if(!Number.isFinite(v[j]) || !Number.isFinite(v[j-1])){
        eksik=true;break;
      }
      const akis=tp[j]*v[j];
      if(tp[j]>tp[j-1]) poz+=akis;
      else if(tp[j]<tp[j-1]) neg+=akis;
    }
    if(eksik || poz+neg===0) continue;
    r[i]=neg===0?100:100-100/(1+poz/neg);
  }
  return r;
}

function ultimateOscillator(h,l,c) {
  const r=Array(c.length).fill(NaN);
  const bp=[],tr=[];
  for(let i=0;i<c.length;i++){
    const onceki=i?c[i-1]:c[i];
    bp[i]=c[i]-Math.min(l[i],onceki);
    tr[i]=Math.max(h[i],onceki)-Math.min(l[i],onceki);
  }
  for(let i=28;i<c.length;i++){
    function oran(p){
      let b=0,t=0;
      for(let j=i-p+1;j<=i;j++){b+=bp[j];t+=tr[j];}
      return t===0?0.5:b/t;
    }
    r[i]=100*(4*oran(7)+2*oran(14)+oran(28))/7;
  }
  return r;
}

function momentum(c,p=14) {
  return c.map((x,i)=>i<p?NaN:x-c[i-p]);
}

function tkeHesapla(h,l,c,v) {
  const rs=rsi(c,14);
  const st=ema(stochastic(h,l,c,14),6);
  const mf=mfi(h,l,c,v,14);
  const cc=cci(h,l,c,14);
  const wr=williamsR(h,l,c,14);
  const mo=momentum(c,14);
  const uo=ultimateOscillator(h,l,c);
  const tke=c.map((_,i)=>{
    const a=[rs[i],st[i],mf[i],cc[i],wr[i],mo[i],uo[i]];
    return a.every(Number.isFinite)?ortalama(a):NaN;
  });
  return {tke,tkeEma:ema(tke,TKE_EMA_PERIYODU),mfi:mf};
}

function yukariKesisim(a,b) {
  for(let i=Math.max(1,a.length-KESISIM_BAKIS);i<a.length;i++){
    if(a[i-1]<=b[i-1] && a[i]>b[i] &&
       [a[i-1],b[i-1],a[i],b[i]].every(Number.isFinite)) return true;
  }
  return false;
}

function sifirKesisim(a) {
  for(let i=Math.max(1,a.length-KESISIM_BAKIS);i<a.length;i++){
    if(Number.isFinite(a[i-1]) && Number.isFinite(a[i]) &&
       a[i-1]<=0 && a[i]>0) return true;
  }
  return false;
}

function ayniMumAnaSinyal(a,b,t) {
  for(let i=Math.max(1,a.length-KESISIM_BAKIS);i<a.length;i++){
    const e=a[i-1]<=b[i-1] && a[i]>b[i] &&
      [a[i-1],b[i-1],a[i],b[i]].every(Number.isFinite);
    const k=Number.isFinite(t[i-1]) && Number.isFinite(t[i]) &&
      t[i-1]<=0 && t[i]>0;
    if(e&&k) return i;
  }
  return -1;
}

function dortSaatlikGrupla(mumlar) {
  const gruplar=new Map();
  const fmt=new Intl.DateTimeFormat("en-CA",{
    timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",
    day:"2-digit",hour:"2-digit",hourCycle:"h23"
  });
  for(const m of mumlar){
    const p=Object.fromEntries(fmt.formatToParts(new Date(m.zaman*1000)).map(x=>[x.type,x.value]));
    const saat=Number(p.hour);
    if(saat<10||saat>=18) continue;
    const bas=saat<14?10:14;
    const key=p.year+p.month+p.day+"-"+bas;
    if(!gruplar.has(key)) gruplar.set(key,[]);
    gruplar.get(key).push(m);
  }
  const sonuc=[];
  for(const grup of gruplar.values()){
    grup.sort((a,b)=>a.zaman-b.zaman);
    if(grup.length<4) continue;
    const ilk=grup[0],son=grup[grup.length-1];
    sonuc.push({
      zaman:ilk.zaman,open:ilk.open,
      high:Math.max(...grup.map(x=>x.high)),
      low:Math.min(...grup.map(x=>x.low)),
      close:son.close,
      volume:grup.every(x=>Number.isFinite(x.volume))?
        grup.reduce((a,x)=>a+x.volume,0):NaN
    });
  }
  return sonuc;
}

function istanbulZaman(t) {
  return Number.isFinite(t)?new Intl.DateTimeFormat("tr-TR",{
    timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"
  }).format(new Date(t*1000)):"-";
}

function formatFiyat(x) {
  return Number.isFinite(x)?x.toLocaleString("tr-TR",{
    minimumFractionDigits:2,maximumFractionDigits:2
  }):"-";
}

function formatOran(x) {
  return Number.isFinite(x)?x.toFixed(2)+"x":"-";
}

function formatDakika(x) {
  if(!Number.isFinite(x)) return "-";
  const gun=Math.floor(x/1440);
  const saat=Math.floor((x%1440)/60);
  const dakika=Math.floor(x%60);
  return gun+" gün "+saat+" saat "+dakika+" dk";
}

// BIST pay listesini alır. Liste alınamazsa güvenli şekilde durur.
async function bistTumPaylariGetir() {
  const cevap=await fetch(TAM_BIST_SAYFA+"?_="+Date.now(),{
    cache:"no-store",credentials:"omit"
  });
  if(!cevap.ok){
    throw new Error("BIST listesi HTTP "+cevap.status+
      " | Kaynak: "+(cevap.headers.get("X-Cors-Source")||"-")+
      " | Proxy: "+(cevap.headers.get("X-Cors-Error")||"-"));
  }
  const html=await cevap.text();
  if(!html||html.length<10000) throw new Error("BIST listesi eksik geldi.");
  const belge=new DOMParser().parseFromString(html,"text/html");
  const kodlar=[];
  for(const satir of belge.querySelectorAll("tr")){
    const hucre=Array.from(satir.querySelectorAll("th,td"));
    if(hucre.length<2) continue;
    const kod=(hucre[0].textContent||"").trim().toLocaleUpperCase("tr-TR");
    if(!/^[A-Z0-9]{3,6}$/.test(kod)) continue;
    const ad=hucre.slice(1).map(x=>x.textContent||"").join(" ").toLocaleUpperCase("tr-TR");
    if(/BORSA YATIRIM FONU|\bBYF\b|YATIRIM FONU|PORTFOY|PORTFÖY|VARANT|SERTIFIKA|SERTİFİKA|ETF/.test(ad)) continue;
    if(!kodlar.includes(kod)) kodlar.push(kod);
  }
  if(kodlar.length<300) throw new Error("Yeterli pay kodu alınamadı: "+kodlar.length);
  return kodlar.sort();
}

// Yahoo bağlantısı: query1 başarısızsa query2 denenir.
async function yahooVerisiAl(sembol) {
  const adresler=["query1.finance.yahoo.com","query2.finance.yahoo.com"];
  const hatalar=[];
  for(const sunucu of adresler){
    const hedef="https://"+sunucu+
      "/v8/finance/chart/"+encodeURIComponent(sembol)+
      "?range="+VERI_ARALIGI+"&interval=1h&includePrePost=false";

    const url="https://proxy.cors.dev/"+hedef+"&_="+Date.now();

    try{
      const cevap=await fetch(url,{
        cache:"no-store",credentials:"omit"
      });
      if(!cevap.ok){
        const kaynak=cevap.headers.get("X-Cors-Source")||"belirsiz";
        const hata=cevap.headers.get("X-Cors-Error")||"-";
        const govde=await cevap.text();
        hatalar.push(sunucu+": HTTP "+cevap.status+
          " | Kaynak: "+kaynak+" | Proxy: "+hata+
          " | "+govde.slice(0,100));
        continue;
      }
      const json=await cevap.json();
      if(json?.chart?.error){
        hatalar.push(sunucu+": "+JSON.stringify(json.chart.error).slice(0,150));
        continue;
      }
      const sonuc=json?.chart?.result?.[0];
      if(sonuc?.timestamp?.length) return sonuc;
      hatalar.push(sunucu+": Yahoo verisi boş.");
    }catch(e){
      hatalar.push(sunucu+": "+(e.message||String(e)));
    }
  }
  throw new Error(hatalar.join(" || "));
}

async function hisseAnaliz(sembol) {
  const sonuc=await yahooVerisiAl(sembol+".IS");
  const meta=sonuc.meta||{};
  const q=sonuc.indicators?.quote?.[0];
  if(!q) throw new Error("Mum verisi bulunamadı.");

  const simdi=Math.floor(Date.now()/1000);
  const hamZamanlar=sonuc.timestamp||[];
  const sonHamZaman=hamZamanlar.length?hamZamanlar[hamZamanlar.length-1]:NaN;
  const hamVeriYasi=Number.isFinite(sonHamZaman)?
    Math.max(0,(simdi-sonHamZaman)/60):Infinity;

  // Eski veri kontrolü: 7 günü aşan veri güncel kabul edilmez.
  const veriGuncel=Number.isFinite(hamVeriYasi) &&
    hamVeriYasi<=AZAMI_VERI_YASI_DAKIKA;

  const mumlar=[];
  for(let i=0;i<hamZamanlar.length;i++){
    const o=q.open?.[i],h=q.high?.[i],l=q.low?.[i],c=q.close?.[i],v=q.volume?.[i];
    if(![o,h,l,c].every(Number.isFinite)) continue;
    const zaman=hamZamanlar[i];
    if(zaman+PERIYOT>simdi) continue;
    mumlar.push({zaman,open:o,high:h,low:l,close:c,volume:Number.isFinite(v)?v:NaN});
  }

  if(mumlar.length<40) throw new Error("Yeterli kapanmış saatlik mum yok: "+mumlar.length);

  const c=mumlar.map(x=>x.close);
  const h=mumlar.map(x=>x.high);
  const l=mumlar.map(x=>x.low);
  const v=mumlar.map(x=>x.volume);
  const e8=ema(c,8),e20=ema(c,20);
  const {tke,tkeEma,mfi:mf}=tkeHesapla(h,l,c,v);
  const son=mumlar.length-1;
  const sonMum=mumlar[son];
  const anaIndex=ayniMumAnaSinyal(e8,e20,tke);
  const oncekiHacimler=v.slice(Math.max(0,son-20),son).filter(x=>Number.isFinite(x)&&x>0);
  const ortHacim=ortalama(oncekiHacimler);
  const hacimOrani=Number.isFinite(v[son])&&v[son]>0&&ortHacim>0?v[son]/ortHacim:NaN;

  const mum4=dortSaatlikGrupla(mumlar);
  let teyit4s="VERİ YETERSİZ",e84=NaN,e204=NaN,tke4=NaN,yon4="-",fiyat4=false;
  if(mum4.length>=40){
    const c4=mum4.map(x=>x.close);
    const h4=mum4.map(x=>x.high);
    const l4=mum4.map(x=>x.low);
    const v4=mum4.map(x=>x.volume);
    const a=ema(c4,8),b=ema(c4,20);
    const t=tkeHesapla(h4,l4,c4,v4).tke;
    const z=mum4.length-1;
    e84=a[z];e204=b[z];tke4=t[z];
    yon4=t[z]>t[z-1]?"YUKARI":t[z]<t[z-1]?"AŞAĞI":"YATAY";
    fiyat4=c4[z]>b[z];
    const puan=(e84>e204?1:0)+(fiyat4?1:0)+(tke4>20?1:0)+(yon4==="YUKARI"?1:0);
    teyit4s=puan===4?"TAMAM":puan>=2?"BEKLİYOR":"ZAYIF";
  }

  return {
    sembol,kapanis:sonMum.close,
    canliFiyat:Number.isFinite(meta.regularMarketPrice)?meta.regularMarketPrice:sonMum.close,
    ema8:e8[son],ema20:e20[son],
    emaDurum:e8[son]>e20[son]?"EMA8 ÜSTTE":"EMA8 ALTTA",
    fiyatEma20Ustu:sonMum.close>e20[son],
    tke:tke[son],tkeEma:tkeEma[son],
    tkeYon:tke[son]>tke[son-1]?"YUKARI":tke[son]<tke[son-1]?"AŞAĞI":"YATAY",
    mfiDurumu:Number.isFinite(mf[son])?"GEÇERLİ":"HACİM VERİSİ EKSİK",
    tkeSifirYukariKesisim:sifirKesisim(tke),
    emaKesim:yukariKesisim(e8,e20),
    anaSinyal:anaIndex>=0,
    anaSinyalZamani:anaIndex>=0?mumlar[anaIndex].zaman:NaN,
    hacim:v[son],hacimOrani,
    sonMumZamani:sonMum.zaman,
    sonHamZaman,
    hamVeriYasi,
    veriGuncel,
    kapanmisMumSayisi:mumlar.length,
    mumSayisi4s:mum4.length,teyit4s,e84,e204,tke4,yon4,fiyat4
  };
}

function siniflandir(x) {
  // Eski veri hiçbir sinyal veya aday listesine alınmaz.
  if(!x.veriGuncel) return "ESKİ VERİ";

  if(x.anaSinyal) return "ANA SİNYAL";
  const k=[
    x.ema8>x.ema20,
    x.fiyatEma20Ustu,
    x.tkeYon==="YUKARI",
    Number.isFinite(x.tke)&&x.tke>0,
    x.mfiDurumu==="GEÇERLİ",
    Number.isFinite(x.hacimOrani)&&x.hacimOrani>=1
  ];
  const p=k.filter(Boolean).length;
  if(p===6) return "GÜÇLÜ ADAY";
  if(p>=3) return "TAKİP LİSTESİ";
  return "ZAYIF";
}

function bistTarama() {
  return bistTaramaCalistir();
}

async function bistTaramaCalistir() {
  const liste=document.querySelector("#hisse-listesi");
  const buton=document.querySelector("#tarama-butonu");
  if(window.taramaDevamEdiyor) return;
  window.taramaDevamEdiyor=true;
  if(buton){buton.disabled=true;buton.textContent="TARAMA YAPILIYOR...";}

  const sonuclar=[],hatalar=[];
  let taramaListesi=[],listeKaynakNotu="";
  try{
    taramaListesi=await bistTumPaylariGetir();
    listeKaynakNotu="GÜNCEL TÜM PAY LİSTESİ";
  }catch(e){
    if(liste) liste.textContent="TÜM BIST LİSTESİ ALINAMADI\n"+
      e.message+"\nTarama güvenlik için durduruldu.";
    window.taramaDevamEdiyor=false;
    if(buton){buton.disabled=false;buton.textContent="TARAMAYI BAŞLAT";}
    return;
  }

  const toplam=taramaListesi.length;
  const gruplar=Math.ceil(toplam/GRUP_BOYUTU);
  const bekle=ms=>new Promise(r=>setTimeout(r,ms));

  try{
    for(let bas=0;bas<toplam;bas+=GRUP_BOYUTU){
      const grup=taramaListesi.slice(bas,bas+GRUP_BOYUTU);
      const no=Math.floor(bas/GRUP_BOYUTU)+1;

      if(liste) liste.textContent=
        "BIST TARAMASI DEVAM EDİYOR\n\n"+
        "Tamamlanan grup: "+(no-1)+" / "+gruplar+
        "\nKontrol: "+(sonuclar.length+hatalar.length)+" / "+toplam+
        "\nBaşarılı: "+sonuclar.length+
        "\nHata: "+hatalar.length+
        "\n\nTaranan grup: "+grup.join(", ");

      const cevaplar=await Promise.allSettled(grup.map(hisseAnaliz));
      cevaplar.forEach((r,i)=>{
        if(r.status==="fulfilled") sonuclar.push(r.value);
        else hatalar.push(grup[i]+": "+(r.reason?.message||String(r.reason)));
      });

      if(liste) liste.textContent=
        "BIST TARAMASI DEVAM EDİYOR\n\n"+
        "Tamamlanan grup: "+no+" / "+gruplar+
        "\nKontrol: "+(sonuclar.length+hatalar.length)+" / "+toplam+
        "\nBaşarılı: "+sonuclar.length+
        "\nHata: "+hatalar.length+
        "\n\nSon grup: "+grup.join(", ");

      if(bas+GRUP_BOYUTU<toplam) await bekle(GRUP_BEKLEME);
    }

    const guncel=sonuclar.filter(x=>x.veriGuncel);
    const eskiVeriler=sonuclar.filter(x=>!x.veriGuncel);

    // Sinyal ve aday sınıflandırmaları yalnızca güncel veriden yapılır.
    const ana=guncel.filter(x=>siniflandir(x)==="ANA SİNYAL");
    const guclu=guncel.filter(x=>siniflandir(x)==="GÜÇLÜ ADAY");
    const takip=guncel.filter(x=>siniflandir(x)==="TAKİP LİSTESİ");
    const zayif=guncel.filter(x=>siniflandir(x)==="ZAYIF");

    // 4 saatlik teyit sayımları da yalnızca güncel verili hisseleri kapsar.
    const tam=guncel.filter(x=>x.teyit4s==="TAMAM");
    const bekleyen=guncel.filter(x=>x.teyit4s==="BEKLİYOR");
    const zayif4=guncel.filter(x=>x.teyit4s==="ZAYIF");
    const yok4=guncel.filter(x=>x.teyit4s==="VERİ YETERSİZ");

    const saat=new Date().toLocaleString("tr-TR",{
      timeZone:"Europe/Istanbul",hour12:false
    });

    const yaslar=sonuclar.filter(x=>Number.isFinite(x.hamVeriYasi));
    const enEskiKayit=yaslar.length?
      yaslar.reduce((a,b)=>a.hamVeriYasi>b.hamVeriYasi?a:b):null;

    let metin="BIST TÜM PAYLAR TARAMA RAPORU\n"+
      "==============================\n"+
      "Tarama: "+saat+
      "\nKontrol: "+(sonuclar.length+hatalar.length)+" / "+toplam+
      " | Başarılı: "+sonuclar.length+
      " | Hata: "+hatalar.length+
      "\nListe: "+listeKaynakNotu+
      " | Gruplar: "+gruplar+" / "+gruplar+
      "\nGÜNCEL VERİ: "+guncel.length+
      " | ESKİ VERİ: "+eskiVeriler.length+
      " | Veri sınırı: 7 gün";

    if(enEskiKayit){
      metin+="\nEn eski Yahoo verisi: "+
        formatDakika(enEskiKayit.hamVeriYasi)+
        " ("+enEskiKayit.sembol+")";
    }

    metin+="\n\n1. ANA SİNYAL ("+ana.length+")\n"+
      "------------------------------\n";

    metin+=ana.length?ana.map(x=>x.sembol+
      " | EMA: "+x.emaDurum+
      " | Fiyat EMA20: "+(x.fiyatEma20Ustu?"ÜSTÜNDE":"ALTINDA")+
      " | TKE: "+formatFiyat(x.tke)+" ("+x.tkeYon+")"+
      " | Sinyal mumu: "+istanbulZaman(x.anaSinyalZamani)+"\n").join(""):"Ana sinyal yok.\n";

    metin+="\n2. GÜÇLÜ ADAYLAR ("+guclu.length+")\n"+
      "------------------------------\n";

    metin+=guclu.length?guclu.map(x=>x.sembol+
      " | Kapanış: "+formatFiyat(x.kapanis)+
      " | "+x.emaDurum+
      " | TKE: "+formatFiyat(x.tke)+" ("+x.tkeYon+")"+
      " | Hacim: "+formatOran(x.hacimOrani)+"\n").join(""):"Güçlü aday yok.\n";

    metin+="\n3. TAKİP LİSTESİ ("+takip.length+")\n"+
      "------------------------------\n"+
      (takip.map(x=>x.sembol).join(", ")||"Takip hissesi yok.")+"\n";

    metin+="\n4. ZAYIF HİSSELER ("+zayif.length+")\n"+
      "------------------------------\n"+
      (zayif.map(x=>x.sembol).join(", ")||"Zayıf hisse yok.")+"\n";

    metin+="\n5. 4 SAATLİK TEYİT\n"+
      "------------------------------\n"+
      "TEYİT TAMAM ("+tam.length+"): "+
      (tam.map(x=>x.sembol).join(", ")||"Yok")+"\n"+
      "TEYİT BEKLİYOR ("+bekleyen.length+"): "+
      (bekleyen.map(x=>x.sembol).join(", ")||"Yok")+"\n"+
      "ZAYIF ("+zayif4.length+"): "+
      (zayif4.map(x=>x.sembol).join(", ")||"Yok")+"\n"+
      "4S VERİ YETERSİZ: "+yok4.length+"\n";

    metin+="\n6. ESKİ VERİLER - SİNYAL DIŞI ("+
      eskiVeriler.length+")\n"+
      "------------------------------\n";

    metin+=eskiVeriler.length?
      eskiVeriler.sort((a,b)=>b.hamVeriYasi-a.hamVeriYasi).map(x=>
        x.sembol+" | Veri yaşı: "+formatDakika(x.hamVeriYasi)+
        " | Son Yahoo zamanı: "+istanbulZaman(x.sonHamZaman)+"\n"
      ).join(""):"7 günden eski veri bulunmadı.\n";

    if(hatalar.length){
      metin+="\n7. ANALİZ HATALARI ("+hatalar.length+")\n"+
        "------------------------------\n"+
        hatalar.join("\n")+"\n";
    }

    metin+="\n==============================\n"+
      "NOT: 7 günden eski veriler sinyal ve aday listelerine alınmaz.\n"+
      "Bu liste teknik ön elemedir, alım-satım talimatı değildir.\n"+
      "4 saatlik teyit saatlik mumlardan oluşturulmuştur.\n"+
      "Yahoo Finance verileri gecikmeli olabilir.\n"+
      "Veri alınamayan hisseler sinyal listesine dahil edilmemiştir.\n";

    if(liste) liste.textContent=metin;
    console.log(metin);
    return sonuclar;

  }finally{
    window.taramaDevamEdiyor=false;
    if(buton){
      buton.disabled=false;
      buton.textContent="TARAMAYI BAŞLAT";
    }
  }
}

window.bistTarama=bistTarama;
window.hisseAnaliz=hisseAnaliz;
