export interface SwingScoreBreakdown {
    valuationDiscount: number;      // / 20
    technicalSetup: number;         // / 20
    catalystPotential: number;      // / 20
    volumeAccumulation: number;     // / 15
    riskReward: number;             // / 15
    antiHypeSafety: number;         // / 10
}

export interface SwingAnalysisResult {
    symbol: string;
    totalScore: number;             // / 100
    classification: 'Strong Swing Opportunity' | 'Watch for Entry' | 'Neutral / Wait' | 'Weak Setup' | 'Avoid / High Risk';
    breakdown: SwingScoreBreakdown;
    explanation: string;
    targetRange?: { min: number, max: number };
    stopLoss?: number;
    estimatedTimeframe: string;
    warnings: string[];
}
