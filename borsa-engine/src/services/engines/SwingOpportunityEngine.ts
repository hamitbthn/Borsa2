import { IMarketDataProvider } from '../providers/interfaces/IMarketDataProvider';
import { IFundamentalDataProvider } from '../providers/interfaces/IFundamentalDataProvider';
import { ICatalystDataProvider } from '../providers/interfaces/ICatalystDataProvider';
import { SwingAnalysisResult, SwingScoreBreakdown } from '../../models/SwingAnalysisResult';

export class SwingOpportunityEngine {
    constructor(
        private marketProvider: IMarketDataProvider,
        private fundamentalProvider: IFundamentalDataProvider,
        private catalystProvider: ICatalystDataProvider
    ) { }

    async analyzeStock(symbol: string): Promise<SwingAnalysisResult> {
        const fundamentals = await this.fundamentalProvider.getFundamentals(symbol);
        const historical = await this.marketProvider.getHistoricalData(symbol, '1D', 14); // 14 günlük kısa vade görünümü
        const catalysts = await this.catalystProvider.getUpcomingCatalysts(symbol);
        const currentPrice = await this.marketProvider.getCurrentPrice(symbol);
        const volumeAvg = await this.marketProvider.getVolumeAverage(symbol, 10);

        const warnings: string[] = [];
        const explanationParts: string[] = [];

        // 1. Value Trap Filter (Değer Tuzağı Tespiti)
        // Borçluluk yüksek ve kar marjları ile büyüme negatifse Değer Tuzağı riski yüksektir.
        const isValueTrap = fundamentals.debtToEquity > 3 && fundamentals.netIncomeGrowth < 0 && fundamentals.revenueGrowth < 0;
        if (isValueTrap) {
            warnings.push("Değer Tuzağı Riski: Şirket kârlı/ucuz görünse de yapısal finansal sorunları var (Yüksek borç, düşen büyüme).");
        }

        // 2. Fake Momentum Filter (Aşırı Fiyat ve Spekülasyon Tespiti)
        const startPrice = historical.length > 0 ? historical[0].open : currentPrice;
        const priceChange = ((currentPrice - startPrice) / startPrice) * 100;
        const hasFakeMomentum = priceChange > 25 && fundamentals.peRatio < 0; // Kârlı olmayan hissede > %25 fırlama
        if (hasFakeMomentum) {
            warnings.push("Fake Momentum: Son günlerde güçlü temellere dayanmayan aşırı fiyat hareketi/patlaması yaşandı. Geç giriş (Late-entry) riski yüksek.");
        }

        // PUANLAMA MANTIĞI (Swing Score)
        const score: SwingScoreBreakdown = {
            valuationDiscount: 0,
            technicalSetup: 0,
            catalystPotential: 0,
            volumeAccumulation: 0,
            riskReward: 0,
            antiHypeSafety: 10 // Maksimumdan başlar, manipülasyon varsa kırılır
        };

        // -- Valuation Discount (Mean Reversion - 20 Puan)
        if (!isValueTrap && fundamentals.peRatio > 0 && fundamentals.peRatio < (fundamentals.sectorAvgPe || 20)) {
            score.valuationDiscount = 15 + (fundamentals.peRatio < 10 ? 5 : 0);
            explanationParts.push("Hisse, sektör çarpanlarına oranla iskontolu işlem görüyor.");
        } else if (isValueTrap) {
            score.valuationDiscount = 0; // Value trap ise iskonto puanı sıfırlanır
        }

        // -- Technical Setup (Pre-Breakout - 20 Puan)
        if (!hasFakeMomentum && priceChange >= -5 && priceChange <= 5) {
            score.technicalSetup = 18;
            explanationParts.push("Fiyat, ortalamalar civarında yatay destek bölgesinde veya daralan bantta (Volatilite Sıkışması).");
        } else if (!hasFakeMomentum && priceChange > 5 && priceChange < 15) {
            score.technicalSetup = 10;
        }

        // -- Volume/Accumulation (Early Accumulation - 15 Puan)
        const recentVolume = historical[historical.length - 1]?.volume || 0;
        if (recentVolume > volumeAvg * 1.5 && priceChange < 5) {
            score.volumeAccumulation = 15;
            explanationParts.push("Fiyatta belirgin bir kırılım olmamasına rağmen dikkat çekici ve kademeli hacim artışı var (Akıllı Para / Erken Toplama sinyali).");
        }

        // -- Catalyst Watcher (20 Puan)
        const posCatalysts = catalysts.filter(c => c.expectedImpact === 'POSITIVE');
        if (posCatalysts.length > 0) {
            score.catalystPotential = 20;
            explanationParts.push(`Yaklaşan pozitif gelişme tetikleyicisi mevcut: ${posCatalysts[0].description}.`);
        }

        // -- Risk Reward Ratio (15 Puan)
        if (isValueTrap || hasFakeMomentum) {
            score.riskReward = 0;
        } else {
            score.riskReward = 12; // Destek bölgesinde olduğu tespit edilirse mantıklı Risk/Ödül oranı
        }

        // -- Anti-Hype Safety Filter (10 Puan)
        if (hasFakeMomentum) {
            score.antiHypeSafety = 0;
        }

        // TOPLAM SKOR VE SINIFLANDIRMA
        const totalScore = Object.values(score).reduce((a, b) => a + b, 0);

        let classification: SwingAnalysisResult['classification'];
        if (totalScore >= 80) classification = 'Strong Swing Opportunity';
        else if (totalScore >= 65) classification = 'Watch for Entry';
        else if (totalScore >= 50) classification = 'Neutral / Wait';
        else if (totalScore >= 35) classification = 'Weak Setup';
        else classification = 'Avoid / High Risk';

        // RİSK PLANLAMASI
        const stopLoss = hasFakeMomentum ? undefined : currentPrice * 0.90; // Geçici hesaplama
        const targetMin = currentPrice * 1.15;
        const targetMax = currentPrice * 1.30;

        let explanation = `Swing Score: ${totalScore}/100. ${explanationParts.join(' ')}`;
        if (classification === 'Watch for Entry') {
            explanation += " Ancak fiyat direnç kırılımını henüz gerçekleştirmediği için doğrudan 'Güçlü Al' değil, takip edilmesi gereken uygun giriş bölgesinde işaretlenmiştir.";
        }

        return {
            symbol,
            totalScore,
            classification,
            breakdown: score,
            explanation,
            warnings,
            stopLoss,
            targetRange: { min: targetMin, max: targetMax },
            estimatedTimeframe: '2-6 Hafta'
        };
    }
}
