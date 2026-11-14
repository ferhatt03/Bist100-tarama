
// ======================================
// BIST100 - YAHOO VERI BAGLANTISI TESTI
// Ilk test: THYAO.IS
// ======================================

async function testYahooConnection() {
  const status = document.querySelector(".status");
  const detail = status?.nextElementSibling;

  status.textContent = "THYAO verisi aliniyor...";

  try {
    const yahooUrl =
      "https://query1.finance.yahoo.com/v8/finance/chart/THYAO.IS?range=1mo&interval=1h";

    const response = await fetch(
      "https://proxy.cors.dev/" + yahooUrl,
      { credentials: "omit" }
    );

    if (!response.ok) {
      throw new Error(
        response.headers.get("X-Cors-Error") ||
        "HTTP " + response.status
      );
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error(
        data.chart?.error?.description || "Veri bulunamadi"
      );
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];

    const candles = timestamps.map((time, i) => ({
      time: new Date(time * 1000),
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i]
    })).filter(c => c.close !== null);

    if (candles.length === 0) {
      throw new Error("Gecerli fiyat verisi gelmedi");
    }

    const last = candles[candles.length - 1];

    status.textContent = "Veri baglantisi basarili!";
    if (detail) {
      detail.textContent =
        "Hisse: THYAO.IS | Son fiyat: " +
        last.close.toFixed(2) +
        " " + (result.meta.currency || "TRY") +
        " | Saatlik veri sayisi: " +
        candles.length +
        " | Son veri: " +
        last.time.toLocaleString("tr-TR");
    }

    console.log("Yahoo veri testi basarili:", candles);

  } catch (error) {
    status.textContent = "Veri baglantisi hatasi!";
    if (detail) {
      detail.textContent = error.message;
    }
    console.error("Yahoo baglanti hatasi:", error);
  }
}

testYahooConnection();
