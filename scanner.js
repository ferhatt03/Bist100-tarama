
const hisseler = [
  "ASELS",
  "TUPRS",
  "BIMAS",
  "THYAO",
  "AKBNK"
];

const status = document.querySelector(".status");
const detail = status?.nextElementSibling;

async function bistTarama() {
  status.textContent = "5 hisse taraniyor...";

  let sonuc = [];

  for (const hisse of hisseler) {
    try {
      const url =
        "https://query1.finance.yahoo.com/v8/finance/chart/" +
        hisse + ".IS?range=1mo&interval=1h";

      const response = await fetch(
        "https://proxy.cors.dev/" + url,
        { credentials: "omit" }
      );

      if (!response.ok) {
        throw new Error("Veri alinamadi");
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];

      if (!result) {
        throw new Error("Veri bulunamadi");
      }

      const quote = result.indicators.quote[0];
      const fiyatlar = quote.close.filter(
        fiyat => Number.isFinite(fiyat)
      );

      if (!fiyatlar.length) {
        throw new Error("Fiyat verisi bos");
      }

      const sonFiyat = fiyatlar[fiyatlar.length - 1];

      sonuc.push({
        hisse,
        fiyat: sonFiyat,
        veri: fiyatlar.length,
        durum: "Basarili"
      });

    } catch (error) {
      sonuc.push({
        hisse,
        durum: "Veri alinamadi"
      });
    }
  }

  status.textContent = "Tarama tamamlandi!";

  detail.textContent =
    "Kontrol edilen hisse: " + hisseler.length;

  let liste = document.getElementById("hisse-listesi");

  if (!liste) {
    liste = document.createElement("div");
    liste.id = "hisse-listesi";
    detail.after(liste);
  }

  liste.innerHTML = "";

  sonuc.forEach(item => {
    const satir = document.createElement("p");

    satir.textContent = item.hisse + " | " +
      (item.fiyat !== undefined
        ? item.fiyat.toFixed(2) + " TL | Saatlik veri: " + item.veri
        : item.durum);

    liste.appendChild(satir);
  });

  console.log("BIST tarama sonucu:", sonuc);
}

bistTarama();
