import cron from 'node-cron';
import { fetchAndIngestDailyData } from './workers/marketDataWorker';
import { SwingDecisionEngine } from './engines/swingDecisionEngine';
import { db } from './db/index';
import { engineSignals, stocks, dailyOhlcv, fundamentals } from './db/schema';
import { sql, desc, eq } from 'drizzle-orm';

/**
 * ACIMASIZ DENETÇİ NOTU: 
 * ABD Borsası 16:00 EST'de kapanır (TSİ 23:00 veya 00:00). 
 * Veri sağlayıcıların veriyi işlemesi ve "Adjusted" hale getirmesi birkaç saat sürer.
 * Bu yüzden en güvenli çalışma saati TSİ 03:00'dir.
 */

async function runDailyProcess() {
    const targetDate = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Dün
    console.log(`[ORCHESTRATOR] 🚀 Cycle started for: ${targetDate}`);

    try {
        // 1. ADIM: VERİ ÇEKME (ETL)
        // Önce depoyu dolduruyoruz.
        await fetchAndIngestDailyData(targetDate);

        // 2. ADIM: ANALİZ EDİLECEK HİSSELERE KARAR VERME
        const activeStocks = await db.select().from(stocks).where(eq(stocks.isActive, true));

        console.log(`[ORCHESTRATOR] 🧠 Decision Engine started for ${activeStocks.length} stocks.`);

        const decisionEngine = new SwingDecisionEngine();

        for (const stock of activeStocks) {
            try {
                // DB'den motorun ihtiyacı olan son 150 mumu çek (Teknik Analiz derinliği için)
                const priceHistory = await db.select()
                    .from(dailyOhlcv)
                    .where(eq(dailyOhlcv.symbol, stock.symbol))
                    .orderBy(desc(dailyOhlcv.date))
                    .limit(150);

                if (priceHistory.length < 20) { // Minimum veri kontrolü
                    console.warn(`[ORCHESTRATOR] ⚠️ Skipped ${stock.symbol}: Insufficient price history.`);
                    continue;
                }

                // En güncel temel verileri çek
                const latestFundamentals = await db.select()
                    .from(fundamentals)
                    .where(eq(fundamentals.symbol, stock.symbol))
                    .orderBy(desc(fundamentals.periodDate))
                    .limit(1)
                    .then(res => res[0]);

                // 3. ADIM: MOTORU ÇALIŞTIR
                const analysisInput = {
                    symbol: stock.symbol,
                    market: "US" as const,
                    sector: stock.sector || "Unknown",
                    currentPrice: Number(priceHistory[0].close),
                    ohlcv: priceHistory.reverse().map(p => ({
                        date: p.date,
                        open: Number(p.open),
                        high: Number(p.high),
                        low: Number(p.low),
                        close: Number(p.close),
                        volume: Number(p.volume)
                    })),
                    fundamentals: {
                        peRatio: latestFundamentals?.peRatio ? Number(latestFundamentals.peRatio) : null,
                        pbRatio: latestFundamentals?.pbRatio ? Number(latestFundamentals.pbRatio) : null,
                        evEbitda: latestFundamentals?.evEbitda ? Number(latestFundamentals.evEbitda) : null,
                        revenueGrowth: latestFundamentals?.revenueGrowthYoy ? Number(latestFundamentals.revenueGrowthYoy) : null,
                        netIncomeGrowth: latestFundamentals?.netIncomeGrowthYoy ? Number(latestFundamentals.netIncomeGrowthYoy) : null,
                        debtToEquity: latestFundamentals?.debtToEquity ? Number(latestFundamentals.debtToEquity) : null,
                        freeCashFlowPositive: latestFundamentals?.fcfPositive || false
                    },
                    sectorPercentiles: { pePercentile: 50, pbPercentile: 50 },
                    macro: { inflationRate: 3.5 }, // ABD için örnek makro veri
                    catalysts: [],
                    news: []
                };

                const result = decisionEngine.analyze(analysisInput);

                // 4. ADIM: SONUÇLARI KAYDET (CQRS - Okuma Tablosuna Yazma)
                await db.insert(engineSignals)
                    .values({
                        symbol: stock.symbol,
                        analysisDate: targetDate,
                        signal: result.signal,
                        swingScore: result.swingScore,
                        confidence: result.confidence,
                        risk: result.warnings.some(w => w.includes("Risk") || w.includes("Trap")) ? 'High' : 'Medium',
                        stopLoss: result.stopLoss.toString(),
                        target1: result.targets.min.toString(),
                        target2: result.targets.max.toString(),
                        entryZone: `${result.entryZone.min.toFixed(2)} - ${result.entryZone.max.toFixed(2)}`,
                        valueTrapDetected: result.warnings.some(w => w.includes("Value Trap")),
                        fakeMomentumDetected: result.warnings.some(w => w.includes("FAKE MOMENTUM")),
                        catalystSummary: result.explanation.length > 0 ? result.explanation.join(' | ') : "No active catalyst."
                    })
                    .onConflictDoUpdate({
                        target: [engineSignals.symbol, engineSignals.analysisDate],
                        set: {
                            signal: sql`EXCLUDED.signal`,
                            swingScore: sql`EXCLUDED.swing_score`,
                            confidence: sql`EXCLUDED.confidence`,
                            risk: sql`EXCLUDED.risk`,
                            stopLoss: sql`EXCLUDED.stop_loss`,
                            target1: sql`EXCLUDED.target_1`,
                            target2: sql`EXCLUDED.target_2`,
                            entryZone: sql`EXCLUDED.entry_zone`,
                            valueTrapDetected: sql`EXCLUDED.value_trap_detected`,
                            fakeMomentumDetected: sql`EXCLUDED.fake_momentum_detected`,
                            catalystSummary: sql`EXCLUDED.catalyst_summary`
                        }
                    });

                console.log(`[ORCHESTRATOR] ✅ Analysis saved for ${stock.symbol}: ${result.signal} (${result.swingScore})`);

            } catch (err) {
                console.error(`[ORCHESTRATOR] ❌ Error processing ${stock.symbol}:`, err);
            }
        }

        console.log(`[ORCHESTRATOR] 🏁 Daily cycle completed successfully.`);

    } catch (criticalErr) {
        console.error(`[ORCHESTRATOR] 🚨 CRITICAL SYSTEM FAILURE:`, criticalErr);
    }
}

// GitHub Actions zaten kendi Cron zamanlayıcısına sahip olduğu için iç içe zamanlayıcı KULLANILMIYOR.
// Doğrudan motoru ateşle ve bitince işlemi sonlandır ki Github Actions görevi sonlandırsın.
runDailyProcess().then(() => {
    console.log("[SYSTEM] 🛡️ Analiz tamamlandı, GitHub Actions kapatılıyor.");
    process.exit(0);
}).catch(err => {
    console.error("[SYSTEM] ❌ Ölümcül hata:", err);
    process.exit(1);
});
