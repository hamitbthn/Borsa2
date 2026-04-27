import {
    pgTable,
    pgEnum,
    varchar,
    boolean,
    timestamp,
    date,
    numeric,
    bigint,
    integer,
    text,
    unique,
    serial
} from 'drizzle-orm/pg-core';

export const tradeSignalEnum = pgEnum('trade_signal', [
    'Strong Swing Opportunity',
    'Watch for Entry',
    'Neutral',
    'Weak Setup',
    'Avoid'
]);

export const riskLevelEnum = pgEnum('risk_level', ['Low', 'Medium', 'High']);

export const stocks = pgTable('stocks', {
    symbol: varchar('symbol', { length: 10 }).primaryKey(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    sector: varchar('sector', { length: 100 }),
    industry: varchar('industry', { length: 100 }),
    isActive: boolean('is_active').default(true),
    updatedAt: timestamp('updated_at').defaultNow()
});

export const dailyOhlcv = pgTable('daily_ohlcv', {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 10 }).references(() => stocks.symbol, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    open: numeric('open', { precision: 12, scale: 4 }).notNull(),
    high: numeric('high', { precision: 12, scale: 4 }).notNull(),
    low: numeric('low', { precision: 12, scale: 4 }).notNull(),
    close: numeric('close', { precision: 12, scale: 4 }).notNull(),
    adjClose: numeric('adj_close', { precision: 12, scale: 4 }).notNull(),
    volume: bigint('volume', { mode: 'number' }).notNull(),
}, (table) => {
    return {
        uniqueSymbolDate: unique('unique_symbol_date').on(table.symbol, table.date)
    };
});

export const fundamentals = pgTable('fundamentals', {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 10 }).references(() => stocks.symbol, { onDelete: 'cascade' }),
    periodDate: date('period_date').notNull(),
    peRatio: numeric('pe_ratio', { precision: 10, scale: 4 }),
    pbRatio: numeric('pb_ratio', { precision: 10, scale: 4 }),
    evEbitda: numeric('ev_ebitda', { precision: 10, scale: 4 }),
    revenueGrowthYoy: numeric('revenue_growth_yoy', { precision: 8, scale: 4 }),
    netIncomeGrowthYoy: numeric('net_income_growth_yoy', { precision: 8, scale: 4 }),
    debtToEquity: numeric('debt_to_equity', { precision: 10, scale: 4 }),
    fcfPositive: boolean('fcf_positive')
}, (table) => {
    return {
        uniqueFundSymbolDate: unique('unique_fund_symbol_date').on(table.symbol, table.periodDate)
    };
});

export const engineSignals = pgTable('engine_signals', {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 10 }).references(() => stocks.symbol, { onDelete: 'cascade' }),
    analysisDate: date('analysis_date').notNull(),
    signal: tradeSignalEnum('signal').notNull(),
    swingScore: integer('swing_score'),
    confidence: integer('confidence'),
    risk: riskLevelEnum('risk').notNull(),
    stopLoss: numeric('stop_loss', { precision: 12, scale: 4 }).notNull(),
    target1: numeric('target_1', { precision: 12, scale: 4 }).notNull(),
    target2: numeric('target_2', { precision: 12, scale: 4 }).notNull(),
    entryZone: varchar('entry_zone', { length: 50 }).notNull(),
    valueTrapDetected: boolean('value_trap_detected').default(false),
    fakeMomentumDetected: boolean('fake_momentum_detected').default(false),
    catalystSummary: text('catalyst_summary'),
    aiConfidenceScore: numeric('ai_confidence_score', { precision: 5, scale: 2 }) // Yeni V4 ML Sütunu
}, (table) => {
    return {
        uniqueSignalSymbolDate: unique('unique_signal_symbol_date').on(table.symbol, table.analysisDate)
    };
});

// ======================== V4 HEDGE FUND MODÜLLERİ ========================

export const userDevices = pgTable('user_devices', {
    id: serial('id').primaryKey(),
    expoPushToken: varchar('expo_push_token', { length: 255 }).notNull().unique(),
    deviceId: varchar('device_id', { length: 255 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow()
});

export const insiderTrades = pgTable('insider_trades', {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 10 }).references(() => stocks.symbol, { onDelete: 'cascade' }),
    insiderName: varchar('insider_name', { length: 255 }).notNull(),
    transactionType: varchar('transaction_type', { length: 50 }).notNull(), // BUY or SELL
    sharesCount: bigint('shares_count', { mode: 'number' }).notNull(),
    transactionPrice: numeric('transaction_price', { precision: 12, scale: 4 }),
    transactionDate: date('transaction_date').notNull(),
    reportedDate: date('reported_date').notNull()
}, (table) => {
    return {
        uniqueInsiderTrade: unique('unique_insider_trade').on(table.symbol, table.insiderName, table.transactionDate, table.sharesCount)
    };
});

export const paperWallets = pgTable('paper_wallets', {
    id: serial('id').primaryKey(),
    deviceId: varchar('device_id', { length: 255 }).references(() => userDevices.deviceId, { onDelete: 'cascade' }),
    balance: numeric('balance', { precision: 15, scale: 4 }).default('100000.00').notNull(),
    updatedAt: timestamp('updated_at').defaultNow()
});

export const paperTrades = pgTable('paper_trades', {
    id: serial('id').primaryKey(),
    walletId: integer('wallet_id').references(() => paperWallets.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 10 }).references(() => stocks.symbol, { onDelete: 'cascade' }),
    side: varchar('side', { length: 10 }).notNull(), // BUY / SELL
    price: numeric('price', { precision: 12, scale: 4 }).notNull(),
    sharesCount: integer('shares_count').notNull(),
    tradeDate: timestamp('trade_date').defaultNow(),
    status: varchar('status', { length: 20 }).default('OPEN') // OPEN / CLOSED
});
