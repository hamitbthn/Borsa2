import { StockAnalysisInput } from './types';
import { calculateATR } from './mathUtils';

export function calculateRiskParams(input: StockAnalysisInput) {
    const { ohlcv, currentPrice } = input;

    if (ohlcv.length < 20) {
        return { stopLoss: currentPrice * 0.90, targetMin: currentPrice * 1.10, targetMax: currentPrice * 1.20 };
    }

    const highs = ohlcv.map(d => d.high);
    const lows = ohlcv.map(d => d.low);
    const closes = ohlcv.map(d => d.close);

    const atrArr = calculateATR(highs, lows, closes, 14);
    const currentAtr = atrArr[atrArr.length - 1] || (currentPrice * 0.05);

    // RULE 1: STOP-LOSS CALCULATION
    const atrStop = currentPrice - (currentAtr * 2);

    const last10Lows = lows.slice(-10);
    const structureStop = Math.min(...last10Lows.filter(Number.isFinite));

    // Clamp logic as requested
    const rawStop = Math.min(atrStop, structureStop);
    const stopLoss = Math.max(rawStop, currentPrice * 0.90); // Max 10% tolerance

    // Swing trading targets based on ATR multiples
    const targetMin = currentPrice + (currentAtr * 3);
    const targetMax = currentPrice + (currentAtr * 6);

    return { stopLoss, targetMin, targetMax };
}

export function runRiskEngine(input: StockAnalysisInput): import('./types').EngineResult {
    const result = { score: 0, maxScore: 10, notes: [], warnings: [] };
    const { stopLoss } = calculateRiskParams(input);
    const riskPercentage = ((input.currentPrice - stopLoss) / input.currentPrice) * 100;

    if (riskPercentage < 5) {
        result.score += 10;
        result.notes.push("Excellent tight risk profile (<5%).");
    } else if (riskPercentage < 8) {
        result.score += 5;
        result.notes.push("Acceptable risk profile.");
    } else {
        result.warnings.push(`Wide stop required (${riskPercentage.toFixed(1)}%).`);
    }

    return result;
}
