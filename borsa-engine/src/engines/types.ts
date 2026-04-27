export type Market = "BIST" | "US";
export type Signal = "Strong Swing Opportunity" | "Watch for Entry" | "Neutral" | "Weak Setup" | "Avoid";

export interface OHLCV {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Fundamentals {
    peRatio: number | null;
    pbRatio: number | null;
    evEbitda: number | null;
    debtToEquity: number | null;
    revenueGrowth: number | null;
    netIncomeGrowth: number | null;
    freeCashFlowPositive: boolean | null;
}

export interface SectorPercentiles {
    pePercentile: number | null; // 0 (cheapest) to 100 (most expensive)
    pbPercentile: number | null;
}

export interface Macro {
    inflationRate: number;
}

export interface Catalyst {
    date: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    description: string;
}

export interface StockAnalysisInput {
    symbol: string;
    market: Market;
    sector: string;
    currentPrice: number;
    ohlcv: OHLCV[];
    fundamentals: Fundamentals;
    sectorPercentiles: SectorPercentiles;
    macro: Macro;
    catalysts: Catalyst[];
    news: any[];
}

export interface SwingDecisionOutput {
    symbol: string;
    swingScore: number;
    rawScore: number;
    maxPossibleScore: number;
    confidence: number;
    signal: Signal;
    entryZone: { min: number; max: number };
    stopLoss: number;
    targets: { min: number; max: number };
    explanation: string[];
    warnings: string[];
}

export interface EngineResult {
    score: number;
    maxScore: number;
    notes: string[];
    warnings: string[];
}
