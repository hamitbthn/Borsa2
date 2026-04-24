import { StockAnalysisInput, EngineResult } from './types';
import { calculateSMA, calculateRSI } from './mathUtils';

export function runTechnicalEngine(input: StockAnalysisInput): EngineResult {
    const { ohlcv } = input;

    // RULE 4: IPO PENALTY FIX
    if (ohlcv.length < 150) {
        return { score: 0, maxScore: 0, notes: ["Insufficient data length"], warnings: ["New listing or insufficient history."] };
    }

    const result: EngineResult = { score: 0, maxScore: 40, notes: [], warnings: [] };
    const closes = ohlcv.map(d => d.close);
    const volumes = ohlcv.map(d => d.volume);

    const rsi = calculateRSI(closes, 14);
    const currentRsi = rsi[rsi.length - 1];

    if (Number.isFinite(currentRsi)) {
        if (currentRsi >= 30 && currentRsi <= 60) {
            result.score += 15;
            result.notes.push("RSI in neutral/accumulation territory.");
        } else if (currentRsi > 70) {
            result.warnings.push("RSI is overbought. Risk elevated.");
        } else if (currentRsi < 30) {
            result.notes.push("RSI indicates oversold conditions.");
            result.score += 10;
        }
    }

    const sma50 = calculateSMA(closes, 50);
    const currentSma50 = sma50[sma50.length - 1];

    if (Number.isFinite(currentSma50)) {
        const currentPrice = closes[closes.length - 1];
        if (currentPrice > currentSma50) {
            result.score += 15;
            result.notes.push("Price above 50 SMA (Uptrend setup).");
        } else if (currentPrice > currentSma50 * 0.95) {
            result.score += 10;
            result.notes.push("Price near 50 SMA support.");
        }
    }

    const recentVol = volumes[volumes.length - 1];
    const smaVol = calculateSMA(volumes, 20);
    const currentAvgVol = smaVol[smaVol.length - 1];

    if (recentVol > currentAvgVol * 1.5) {
        result.score += 10;
        result.notes.push("Recent volume expansion detected.");
    }

    return result;
}
