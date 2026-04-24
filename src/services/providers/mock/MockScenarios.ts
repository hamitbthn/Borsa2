import { Stock } from '../../../models/Stock';

export const PUMP_STOCK_MOCK: Stock = {
    symbol: 'PUMP',
    name: 'HypeTech Corp',
    sector: 'Technology',
    marketCap: 50000000,
    currentPrice: 15.0,
    historicalData: [
        { date: '2026-04-20', open: 5.0, high: 5.5, low: 4.8, close: 5.2, volume: 10000 },
        { date: '2026-04-21', open: 5.2, high: 8.0, low: 5.1, close: 7.8, volume: 500000 },
        { date: '2026-04-22', open: 8.0, high: 12.0, low: 7.5, close: 11.5, volume: 1200000 },
        { date: '2026-04-23', open: 12.0, high: 16.0, low: 11.0, close: 15.0, volume: 2500000 },
    ],
    fundamentals: {
        peRatio: -15, pbRatio: 25, evEbitda: -10, debtToEquity: 3.5,
        revenueGrowth: -5, netIncomeGrowth: -20, profitMargin: -15, sectorAvgPe: 15, sectorAvgPb: 2,
    },
    catalysts: []
};

export const VALUE_TRAP_MOCK: Stock = {
    symbol: 'TRAP',
    name: 'OldRetail Inc',
    sector: 'Retail',
    marketCap: 200000000,
    currentPrice: 2.5,
    historicalData: [
        { date: '2026-04-20', open: 3.0, high: 3.1, low: 2.8, close: 2.9, volume: 50000 },
        { date: '2026-04-21', open: 2.9, high: 2.9, low: 2.7, close: 2.7, volume: 55000 },
        { date: '2026-04-22', open: 2.7, high: 2.8, low: 2.5, close: 2.6, volume: 60000 },
        { date: '2026-04-23', open: 2.6, high: 2.7, low: 2.4, close: 2.5, volume: 70000 },
    ],
    fundamentals: {
        peRatio: 5, pbRatio: 0.5, evEbitda: 4, debtToEquity: 5.8,
        revenueGrowth: -15, netIncomeGrowth: -50, profitMargin: -5, sectorAvgPe: 12, sectorAvgPb: 1.5,
    },
    catalysts: []
};

export const EARLY_ACC_MOCK: Stock = {
    symbol: 'EARLY',
    name: 'FutureEnergy',
    sector: 'Energy',
    marketCap: 800000000,
    currentPrice: 10.2,
    historicalData: [
        { date: '2026-04-20', open: 10.0, high: 10.1, low: 9.9, close: 10.0, volume: 10000 },
        { date: '2026-04-21', open: 10.0, high: 10.2, low: 10.0, close: 10.1, volume: 25000 },
        { date: '2026-04-22', open: 10.1, high: 10.3, low: 10.0, close: 10.1, volume: 80000 },
        { date: '2026-04-23', open: 10.1, high: 10.4, low: 10.1, close: 10.2, volume: 150000 },
    ],
    fundamentals: {
        peRatio: 12, pbRatio: 1.2, evEbitda: 8, debtToEquity: 0.8,
        revenueGrowth: 15, netIncomeGrowth: 10, profitMargin: 12, sectorAvgPe: 15, sectorAvgPb: 1.5,
    },
    catalysts: [
        { type: 'REGULATORY', date: '2026-05-15', expectedImpact: 'POSITIVE', description: 'Yeni enerji regülasyon onayı bekleniyor' }
    ]
};

export const STRONG_SWING_MOCK: Stock = {
    symbol: 'SWING',
    name: 'HealthTech Bio',
    sector: 'Healthcare',
    marketCap: 1500000000,
    currentPrice: 45.0,
    historicalData: [
        { date: '2026-04-20', open: 42.0, high: 43.0, low: 41.5, close: 42.5, volume: 200000 },
        { date: '2026-04-21', open: 42.5, high: 44.0, low: 42.5, close: 43.8, volume: 350000 },
        { date: '2026-04-22', open: 43.8, high: 44.5, low: 43.0, close: 44.2, volume: 300000 },
        { date: '2026-04-23', open: 44.2, high: 45.5, low: 44.0, close: 45.0, volume: 500000 },
    ],
    fundamentals: {
        peRatio: 18, pbRatio: 2.0, evEbitda: 10, debtToEquity: 0.5,
        revenueGrowth: 25, netIncomeGrowth: 35, profitMargin: 20, sectorAvgPe: 25, sectorAvgPb: 3.5,
    },
    catalysts: [
        { type: 'EARNINGS', date: '2026-05-02', expectedImpact: 'POSITIVE', description: 'Q1 Bilanço Beklentisi (Kar marjlarında artış)' }
    ]
};

export const ALL_MOCK_STOCKS = [PUMP_STOCK_MOCK, VALUE_TRAP_MOCK, EARLY_ACC_MOCK, STRONG_SWING_MOCK];
