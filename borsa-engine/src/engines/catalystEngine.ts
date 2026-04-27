import { StockAnalysisInput, EngineResult } from './types';

export function runCatalystEngine(input: StockAnalysisInput): EngineResult {
    const { catalysts } = input;
    const result: EngineResult = { score: 0, maxScore: 0, notes: [], warnings: [] };

    if (!catalysts || catalysts.length === 0) {
        return result; // Don't inflate maxScore if missing
    }

    result.maxScore += 15;

    const positiveCatalysts = catalysts.filter(c => c.impact === 'POSITIVE');
    if (positiveCatalysts.length > 0) {
        result.score += 15;
        result.notes.push(`Catalyst present: ${positiveCatalysts[0].description}`);
    } else if (catalysts.some(c => c.impact === 'NEGATIVE')) {
        result.warnings.push("Negative catalyst upcoming.");
    }

    return result;
}
