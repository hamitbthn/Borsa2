import { db } from '../db/index'; // Drizzle bağlantın
import { stocks, dailyOhlcv } from '../db/schema'; // Şema tanımların
import { sql } from 'drizzle-orm';
import fetch from 'node-fetch'; // Gerekirse polyfill eklenebilir

// Polygon API anahtarı çevre değişkenlerinden alınmalıdır
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

// Amatör tuzağını bozan hayat kurtarıcı fonksiyon: Rate Limiter Delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Polygon'dan gelen raw veri tipi
interface PolygonResponse {
    status: string;
    from: string;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    afterHours: number;
    preMarket: number;
}

export async function fetchAndIngestDailyData(targetDate: string) {
    console.log(`[ETL PIPELINE] Ingestion started for date: ${targetDate}`);

    // 1. İşlem yapılacak aktif hisseleri veritabanından çek (Örn: Sadece is_active = true olanlar)
    let activeStocks = await db.query.stocks.findMany({
        where: (stocks, { eq }) => eq(stocks.isActive, true),
        columns: { symbol: true }
    });

    if (activeStocks.length === 0) {
        console.warn("[ETL PIPELINE] Hisseler tablosu BOMBOŞ! Motor durmasın diye otomatik DEV (Mega-Cap) hisseler enjekte ediliyor...");
        const defaultStocks = [
            { symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology' },
            { symbol: 'MSFT', companyName: 'Microsoft Corporation', sector: 'Technology' },
            { symbol: 'TSLA', companyName: 'Tesla Inc.', sector: 'Automotive' },
            { symbol: 'NVDA', companyName: 'NVIDIA Corporation', sector: 'Semiconductors' }
        ];
        await db.insert(stocks).values(defaultStocks).onConflictDoNothing();

        activeStocks = await db.query.stocks.findMany({
            where: (stocks, { eq }) => eq(stocks.isActive, true),
            columns: { symbol: true }
        });
    }

    let successCount = 0;
    let failCount = 0;

    // 2. Sıralı İşleme (Senkron Döngü - Rate Limit koruması için asla Promise.all kullanılmaz!)
    for (const stock of activeStocks) {
        try {
            const url = `https://api.polygon.io/v1/open-close/${stock.symbol}/${targetDate}?adjusted=true&apiKey=${POLYGON_API_KEY}`;

            const response = await fetch(url);

            if (response.status === 429) {
                console.warn(`[ETL PIPELINE] Rate limit hit for ${stock.symbol}. Forcing extended sleep...`);
                await sleep(15000); // Ekstra bekleme cezası
                failCount++;
                continue; // Bu hisseyi atla, yarın tekrar dener (veya retry mekanizması eklenebilir)
            }

            if (!response.ok) {
                console.log(`[ETL PIPELINE] No data for ${stock.symbol} on ${targetDate} (Market closed or invalid symbol).`);
                failCount++;
                // Ücretsiz paket dakikada 5 istek = İstek başı 12 saniye bekleme zorunluluğu
                await sleep(12500);
                continue;
            }

            const data = (await response.json()) as PolygonResponse;

            // QA/QC: Veri Bütünlüğü Doğrulaması (Data Integrity Check)
            // Hatalı sıfır veya negatif fiyat varsa veritabanını zehirleme, doğrudan reddet.
            if (data.open <= 0 || data.close <= 0 || data.high <= 0 || data.low <= 0 || data.volume < 0) {
                console.error(`[ETL PIPELINE] Data integrity failure for ${stock.symbol}. Corrupted values detected.`);
                failCount++;
                await sleep(12500);
                continue;
            }

            // 3. Drizzle ORM ile Atomic UPSERT İşlemi
            await db.insert(dailyOhlcv)
                .values({
                    symbol: data.symbol,
                    date: targetDate,
                    open: data.open.toString(),   // Numeric tipler string olarak geçilebilir
                    high: data.high.toString(),
                    low: data.low.toString(),
                    close: data.close.toString(),
                    adjClose: data.close.toString(), // Polygon 'adjusted=true' parametresiyle doğrudan düzeltilmiş veri yollar
                    volume: data.volume
                })
                .onConflictDoUpdate({
                    target: [dailyOhlcv.symbol, dailyOhlcv.date],
                    set: {
                        open: sql`EXCLUDED.open`,
                        high: sql`EXCLUDED.high`,
                        low: sql`EXCLUDED.low`,
                        close: sql`EXCLUDED.close`,
                        adjClose: sql`EXCLUDED.adj_close`,
                        volume: sql`EXCLUDED.volume`
                    }
                });

            console.log(`[ETL PIPELINE] ✅ Successfully ingested ${stock.symbol}`);
            successCount++;

            // Polygon Ücretsiz Paket Kısıtlaması: 5 requests/minute = 1 request per 12 seconds.
            // Bu güvenlik kilidini asla kaldırma, yoksa IP adresin banlanır.
            await sleep(12500);

        } catch (error) {
            console.error(`[ETL PIPELINE] Fatal error processing ${stock.symbol}:`, error);
            failCount++;
            await sleep(12500);
        }
    }

    console.log(`[ETL PIPELINE] Completed. Success: ${successCount}, Failed/Skipped: ${failCount}`);
}

// Kullanım Örneği (Dün gecenin kapanışını çekmek için)
// const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
// fetchAndIngestDailyData(yesterday);
