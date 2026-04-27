import { SwingDecisionOutput } from './types';

export interface PositionSizingInput {
    totalCapital: number;
    decision: SwingDecisionOutput;
    maxRiskPerTradePct?: number;
}

export interface PositionSizingOutput {
    allocatedCapital: number;
    capitalPercentage: number;
    recommendedShares: number;
    atRiskCapital: number;
    explanation: string;
}

export function calculateKellyCriterion(winRate: number, rewardRiskRatio: number): number {
    if (rewardRiskRatio <= 0) return 0;
    // Simple Kelly Fraction = W - [(1 - W) / R]
    const kellyPct = winRate - ((1 - winRate) / rewardRiskRatio);
    return Math.max(0, kellyPct); // Asla eksi yatirim yapilamaz
}

export function alignByFixedFractional(input: PositionSizingInput): PositionSizingOutput | null {
    const { totalCapital, decision, maxRiskPerTradePct = 0.02 } = input;

    // Sinyal negatifse direkt red
    if (decision.signal === "Avoid" || decision.signal === "Weak Setup" || decision.signal === "Neutral") {
        return null;
    }

    const entryPrice = decision.entryZone.max;
    const stopLoss = decision.stopLoss;

    if (stopLoss >= entryPrice) {
        return null; // Mantıksız Stop Loss engeli
    }

    const riskPerShare = entryPrice - stopLoss;

    // Maksimum kaybetme lüksümüz (Örn: 100K kasa, %2 risk = 2000 TL)
    const maxCapitalRisk = totalCapital * maxRiskPerTradePct;

    // Alınabilecek mutlak lot sayısı hesaplaması
    let sharesToBuy = Math.floor(maxCapitalRisk / riskPerShare);

    let allocatedCapital = sharesToBuy * entryPrice;

    // PORTFOLIO DIVERSIFICATION GÜVENLİĞİ: Tek işleme %30'dan fazla girmeyi engelle
    const MAX_PORTFOLIO_ALLOCATION = 0.30;
    if (allocatedCapital > totalCapital * MAX_PORTFOLIO_ALLOCATION) {
        allocatedCapital = totalCapital * MAX_PORTFOLIO_ALLOCATION;
        sharesToBuy = Math.floor(allocatedCapital / entryPrice);
    }

    const capitalPercentage = (allocatedCapital / totalCapital) * 100;
    const atRiskCapital = sharesToBuy * riskPerShare;

    const explanation = `[RİSK YÖNETİMİ] XYZ Hissesi Güçlü Fırsat. Stop-Loss: ${stopLoss.toFixed(2)} TL / Hedef: ${decision.targets.min.toFixed(2)} TL. Toplam risk edilecek bakiye en fazla kasanın %${(maxRiskPerTradePct * 100).toFixed(1)}'si ile sınırlandırılmıştır. ÖNERİ: Kasanızın %${capitalPercentage.toFixed(1)}'i ile (${sharesToBuy} Lot) giriş yapınız.`;

    return {
        allocatedCapital,
        capitalPercentage,
        recommendedShares: sharesToBuy,
        atRiskCapital,
        explanation
    };
}
