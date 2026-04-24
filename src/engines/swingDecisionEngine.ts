import { StockAnalysisInput, SwingDecisionOutput, Signal } from './types';
import { runValuationEngine } from './valuationEngine';
import { runTechnicalEngine } from './technicalEngine';
import { runRiskEngine, calculateRiskParams } from './riskEngine';
import { runCatalystEngine } from './catalystEngine';
import { runFakeMomentumFilter } from './fakeMomentumFilter';

export class SwingDecisionEngine {
    public analyze(input: StockAnalysisInput): SwingDecisionOutput {
        const valResult = runValuationEngine(input);
        const techResult = runTechnicalEngine(input);
        const riskResult = runRiskEngine(input);
        const catResult = runCatalystEngine(input);
        const momentumResult = runFakeMomentumFilter(input);

        const rawScore = valResult.score + techResult.score + riskResult.score + catResult.score + momentumResult.score;

        // RULE 6: SCORE NORMALIZATION DYNAMIC MAXSCORE
        const maxPossibleScore = valResult.maxScore + techResult.maxScore + riskResult.maxScore + catResult.maxScore + momentumResult.maxScore;

        const swingScore = maxPossibleScore > 0 ? Math.round((rawScore / maxPossibleScore) * 100) : 0;

        const explanation = [
            ...valResult.notes,
            ...techResult.notes,
            ...riskResult.notes,
            ...catResult.notes,
            ...momentumResult.notes
        ];

        const warnings = [
            ...valResult.warnings,
            ...techResult.warnings,
            ...riskResult.warnings,
            ...catResult.warnings,
            ...momentumResult.warnings
        ];

        let signal: Signal;
        if (warnings.some(w => w.includes("FAKE MOMENTUM DETECTED") || w.includes("Value Trap"))) {
            signal = "Avoid";
        } else if (maxPossibleScore < 30) {
            signal = "Weak Setup";
            warnings.push("System confidence low due to severe missing data constraints.");
        } else if (swingScore >= 80) {
            signal = "Strong Swing Opportunity";
        } else if (swingScore >= 65) {
            signal = "Watch for Entry";
        } else if (swingScore >= 50) {
            signal = "Neutral";
        } else if (swingScore >= 35) {
            signal = "Weak Setup";
        } else {
            signal = "Avoid";
        }

        const { stopLoss, targetMin, targetMax } = calculateRiskParams(input);
        const currentPrice = input.currentPrice;

        return {
            symbol: input.symbol,
            swingScore,
            rawScore,
            maxPossibleScore,
            // Maximum potential max score is roughly ~100 assuming everything is present.
            // Simplified confidence metric.
            confidence: Math.min(Math.round((maxPossibleScore / 85) * 100), 100),
            signal,
            entryZone: { min: currentPrice * 0.98, max: currentPrice * 1.02 },
            stopLoss,
            targets: { min: targetMin, max: targetMax },
            explanation,
            warnings
        };
    }
}
