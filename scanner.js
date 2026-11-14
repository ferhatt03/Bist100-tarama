
// ======================================
// BIST100 TARAMA SISTEMI
// SURUM 1 - TARAMA PANELI
// ======================================

const status = document.querySelector(".status");
const detail = status?.nextElementSibling;

async function startScanner() {
  if (!status) return;

  status.textContent = "BIST100 tarama sistemi hazirlaniyor...";

  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/THYAO.IS?range=1mo&interval=1h";

    const response = await fetch(
      "https://proxy.cors.dev/" + url,
      { credentials: "omit" }
    );

    if (!response.ok) {
      throw new Error("Veri baglantisi basarisiz");
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error("Hisse verisi bulunamadi");
    }

    const candles = result.timestamp || [];
    const last = candles.length - 1;
    const price = result.indicators.quote[0].close[last];

    if (price == null) {
      throw new Error("Son fiyat alinamadi");
    }

    status.textContent = "Veri baglantisi basarili!";

    if (detail) {
      detail.textContent =
        "THYAO son fiyat: " +
        price.toFixed(2) +
        " TL | Saatlik veri: " +
        candles.length;
    }

  } catch (error) {
    status.textContent = "Baglanti hatasi!";
    if (detail) detail.textContent = error.message;
  }
}

startScanner();
