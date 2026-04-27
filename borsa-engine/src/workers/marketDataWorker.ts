import { db } from '../db/index'; // Drizzle bağlantın
import { stocks, dailyOhlcv } from '../db/schema'; // Şema tanımların
import { sql, eq } from 'drizzle-orm';
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
    let activeStocks = await db.select().from(stocks).where(eq(stocks.isActive, true));

    if (activeStocks.length === 0) {
        console.warn("[ETL PIPELINE] Hisseler tablosu BOMBOŞ! Motor durmasın diye otomatik DEV (Mega-Cap) hisseler enjekte ediliyor...");
        const defaultStocks = [
            { symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology' },
            { symbol: 'MSFT', companyName: 'Microsoft Corporation', sector: 'Technology' },
            { symbol: 'TSLA', companyName: 'Tesla Inc.', sector: 'Automotive' },
            { symbol: 'NVDA', companyName: 'NVIDIA Corporation', sector: 'Semiconductors' }
        ];
        await db.insert(stocks).values(defaultStocks).onConflictDoNothing();

        activeStocks = await db.select().from(stocks).where(eq(stocks.isActive, true));
    }

    let successCount = 0;
    let failCount = 0;

    // 2. Sıralı İşleme (Senkron Döngü - Rate Limit koruması için asla Promise.all kullanılmaz!)
    for (const stock of activeStocks) {
        try {
            // Hedefimiz 1 günlük değil, hesaplamaların taze kalması için son 6 aylık (180 gün) veriyi Topluca (Bulk) çekmektir.
            const fromDate = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
            const toDate = targetDate;
            const url = `https://api.polygon.io/v2/aggs/ticker/${stock.symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;

            const response = await fetch(url);

            if (response.status === 429) {
                console.warn(`[ETL PIPELINE] Rate limit hit for ${stock.symbol}. Forcing extended sleep...`);
                await sleep(15000); // Ekstra bekleme cezası
                failCount++;
                continue; // Bu hisseyi atla, yarın tekrar dener
            }

            if (!response.ok) {
                console.log(`[ETL PIPELINE] Hata: Polygon'dan ${stock.symbol} verisi çekilemedi (Yanıt Kodu: ${response.status}).`);
                failCount++;
                await sleep(12500);
                continue;
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                console.warn(`[ETL PIPELINE] ${stock.symbol} için boş sonuç döndü. API'de problem olabilir.`);
                failCount++;
                await sleep(12500);
                continue;
            }

            // Toplu okunan 180 günlük verinin DB'ye Bulk UPSERT için hazırlanması
            const bulkData = data.results.map((r: any) => ({
                symbol: stock.symbol,
                date: new Date(r.t).toISOString().split('T')[0],
                open: r.o.toString(),
                high: r.h.toString(),
                low: r.l.toString(),
                close: r.c.toString(),
                adjClose: r.c.toString(), // v2/aggs adjusted=true ise fiyat zaten bölünmüş/düzeltilmiştir
                volume: Math.round(Number(r.v)) // Polygon kesirli hacim gönderdiğinde BigInt (Postgres) patlamasını önlemek için tam sayıya yuvarlanır
            }));

            // 3. Drizzle ORM ile Bulk Atomic UPSERT İşlemi
            await db.insert(dailyOhlcv)
                .values(bulkData)
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

            console.log(`[ETL PIPELINE] ✅ Successfully ingested ${bulkData.length} records for ${stock.symbol}`);
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
