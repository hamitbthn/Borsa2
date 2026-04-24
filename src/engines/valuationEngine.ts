import { StockAnalysisInput, EngineResult } from './types';

export function runValuationEngine(input: StockAnalysisInput): EngineResult {
    const { fundamentals, sectorPercentiles, macro, market } = input;
    const result: EngineResult = { score: 0, maxScore: 0, notes: [], warnings: [] };
    let trapScore = 0;

    // RULE 3: Value Trap Data Leak punishment
    if (fundamentals.revenueGrowth === null) trapScore += 1;
    if (fundamentals.netIncomeGrowth === null) trapScore += 1;
    if (fundamentals.freeCashFlowPositive === null) trapScore += 1;

    if (trapScore >= 2) {
        result.warnings.push("High Value Trap Risk: Insufficient fundamental data.");
    } else if (fundamentals.debtToEquity && fundamentals.debtToEquity > 3) {
        if (fundamentals.netIncomeGrowth && fundamentals.netIncomeGrowth < 0) {
            result.warnings.push("Value Trap: High debt with negative growth.");
            trapScore += 2;
        }
    }

    // RULE 2: VALUATION NULL INFLATION
    if (fundamentals.peRatio !== null) {
        result.maxScore += 10;
        if (fundamentals.peRatio > 0 && fundamentals.peRatio < 15) {
            result.score += 10;
            result.notes.push("Attractive P/E ratio.");
        } else if (fundamentals.peRatio >= 15 && fundamentals.peRatio < 25) {
            result.score += 5;
        }
    }

    if (sectorPercentiles.pePercentile !== null) {
        result.maxScore += 10;
        if (sectorPercentiles.pePercentile < 30) {
            result.score += 10;
            result.notes.push("Trading at a discount to sector peers.");
        }
    }

    // RULE 7: Macro Environment Handling
    const inflationThreshold = market === "BIST" ? macro.inflationRate + 5 : 10;

    if (fundamentals.revenueGrowth !== null) {
        result.maxScore += 10;
        if (fundamentals.revenueGrowth > inflationThreshold) {
            result.score += 10;
            result.notes.push(`Revenue growth beats real inflation proxy (${inflationThreshold}%).`);
        } else {
            result.warnings.push(`Revenue growth lagging behind threshold (${inflationThreshold}%).`);
        }
    }

    if (fundamentals.netIncomeGrowth !== null) {
        result.maxScore += 10;
        if (fundamentals.netIncomeGrowth > inflationThreshold) {
            result.score += 10;
            result.notes.push(`Net income growth beats threshold (${inflationThreshold}%).`);
        }
    }

    if (trapScore >= 2) {
        // Punish overall score if trap indicators hit
        result.score = Math.floor(result.score * 0.5);
        result.notes.push("Score halved due to value trap indicators.");
    }

    return result;
}
