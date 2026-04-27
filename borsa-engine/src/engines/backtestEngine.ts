/**
 * Geriye Dönük Test Laboratuvarı (Backtesting Engine)
 * Geçmiş kriz ve boğa dönemlerinde sistemi doğrulamak için tasarlandı.
 */
import { SwingDecisionEngine } from './swingDecisionEngine';
import { StockAnalysisInput } from './types';

export interface BacktestScenario {
    id: string; // Örn: '2020-CRASH' veya '2023-BULL'
    description: string;
    date: string; // YYYY-MM-DD
    historicalDataSlice: StockAnalysisInput;
    futureDataSlice: { date: string, close: number }[]; // Gelecekteki 20-30 işlem günü
}

export interface BacktestResult {
    scenarioId: string;
    symbol: string;
    signal: string;
    entryPrice: number;
    stopLoss: number;
    targetMin: number;
    hitTarget: boolean;
    hitStopLoss: boolean;
    pnlPercentage: number;
    daysHeld: number;
}

export class BacktestEngine {
    private decisionEngine: SwingDecisionEngine;

    constructor() {
        this.decisionEngine = new SwingDecisionEngine();
    }

    public runTest(scenario: BacktestScenario): BacktestResult {
        console.log(`[BACKTEST] Senaryo Simüle Ediliyor: ${scenario.description} (${scenario.date})`);

        // Geçmiş tarihteki veriyi sanki o günmüşüz gibi motora veriyoruz
        const decision = this.decisionEngine.analyze(scenario.historicalDataSlice);

        const entryPrice = scenario.historicalDataSlice.currentPrice;
        let hitTarget = false;
        let hitStopLoss = false;
        let pnlPercentage = 0;
        let daysHeld = 0;

        // Karar zayıfsa simülasyona sokma (işleme girmemiş varsay)
        if (decision.signal.includes("Avoid") || decision.signal === "Neutral") {
            return { scenarioId: scenario.id, symbol: scenario.historicalDataSlice.symbol, signal: decision.signal, entryPrice, stopLoss: 0, targetMin: 0, hitTarget: false, hitStopLoss: false, pnlPercentage: 0, daysHeld: 0 };
        }

        // İleri Sarım Döngüsü (Gelecekteki günleri sırayla oku)
        for (const futureDay of scenario.futureDataSlice) {
            daysHeld++;

            if (futureDay.close <= decision.stopLoss) {
                hitStopLoss = true;
                pnlPercentage = ((decision.stopLoss - entryPrice) / entryPrice) * 100;
                break;
            }

            if (futureDay.close >= decision.targets.min) {
                hitTarget = true;
                pnlPercentage = ((futureDay.close - entryPrice) / entryPrice) * 100;
                break;
            }
        }

        // Zaman doldu ama tetikleyiciye vurmadıysa aktif pnl
        if (!hitTarget && !hitStopLoss && scenario.futureDataSlice.length > 0) {
            const lastClose = scenario.futureDataSlice[scenario.futureDataSlice.length - 1].close;
            pnlPercentage = ((lastClose - entryPrice) / entryPrice) * 100;
        }

        return {
            scenarioId: scenario.id,
            symbol: scenario.historicalDataSlice.symbol,
            signal: decision.signal,
            entryPrice,
            stopLoss: decision.stopLoss,
            targetMin: decision.targets.min,
            hitTarget,
            hitStopLoss,
            pnlPercentage,
            daysHeld
        };
    }
}
