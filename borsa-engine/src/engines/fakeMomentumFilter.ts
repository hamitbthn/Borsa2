import { StockAnalysisInput, EngineResult } from './types';
import { calculateRSI } from './mathUtils';

export function runFakeMomentumFilter(input: StockAnalysisInput): EngineResult {
    const { ohlcv, fundamentals } = input;
    const result: EngineResult = { score: 0, maxScore: 10, notes: [], warnings: [] };

    if (ohlcv.length < 10) return result;

    const closes = ohlcv.map(d => d.close);
    const recentClose = closes[closes.length - 1];
    const pastClose = closes[closes.length - 6]; // 5 days back

    const rsiArr = calculateRSI(closes, 14);
    const currentRsi = rsiArr[rsiArr.length - 1];

    const priceReturn5d = ((recentClose - pastClose) / pastClose) * 100;

    let isFakeMomentum = false;

    // Pumped > 30% with poor or missing PE
    if (priceReturn5d > 30 && (fundamentals.peRatio === null || fundamentals.peRatio < 0)) {
        isFakeMomentum = true;
    }

    if (priceReturn5d > 50) {
        isFakeMomentum = true; // Extreme unreasonable move
    }

    if (Number.isFinite(currentRsi) && currentRsi > 80 && priceReturn5d > 20) {
        isFakeMomentum = true;
    }

    if (isFakeMomentum) {
        result.score = 0;
        result.maxScore = 10;
        result.warnings.push("FAKE MOMENTUM DETECTED: Recent price surge exhibits pump characteristics.");
    } else {
        result.score = 10;
        result.maxScore = 10;
        result.notes.push("Momentum is healthy and validated.");
    }

    return result;
}
