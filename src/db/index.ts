import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dailyOhlcv, fundamentals } from './schema';
import { sql } from 'drizzle-orm';

// Prodüksiyonda Pool bağlantısı connection_string üzerinden ENV ile yönetilir
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/borsa_db'
});

export const db = drizzle(pool);

/**
 * Bulk Upsert OHLCV (Hedge Fund Standardı)
 * ON CONFLICT DO UPDATE -> Veriyi çekerken geçmişteki bir OHLCV veya Temettü bilgisi değiştiyse, 
 * eski çatlak veriyi yenisiyle ezerek motorun ölümcül bir ATR/RSI yalanlaması yaşamasını engeller.
 */
export async function upsertDailyOhlcv(ohlcvDataArray: typeof dailyOhlcv.$inferInsert[]) {
    if (ohlcvDataArray.length === 0) return;

    await db.insert(dailyOhlcv)
        .values(ohlcvDataArray)
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
}

/**
 * Bulk Upsert Fundamentals (Temel Analiz)
 * API'den geçmiş tarihli güncellenmiş (revize edilmiş bilanço) gelirse, database anında yamalanır!
 */
export async function upsertFundamentals(fundDataArray: typeof fundamentals.$inferInsert[]) {
    if (fundDataArray.length === 0) return;

    await db.insert(fundamentals)
        .values(fundDataArray)
        .onConflictDoUpdate({
            target: [fundamentals.symbol, fundamentals.periodDate],
            set: {
                peRatio: sql`EXCLUDED.pe_ratio`,
                pbRatio: sql`EXCLUDED.pb_ratio`,
                evEbitda: sql`EXCLUDED.ev_ebitda`,
                revenueGrowthYoy: sql`EXCLUDED.revenue_growth_yoy`,
                netIncomeGrowthYoy: sql`EXCLUDED.net_income_growth_yoy`,
                debtToEquity: sql`EXCLUDED.debt_to_equity`,
                fcfPositive: sql`EXCLUDED.fcf_positive`
            }
        });
}
